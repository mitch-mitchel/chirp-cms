#!/bin/bash

# ================================
# Setup AWS Infrastructure for CHIRP CMS
# ================================
# This script creates:
# - VPC with public/private subnets (optional - can use default VPC)
# - RDS PostgreSQL database
# - EFS file system for media storage
# - Application Load Balancer
# - Security Groups
# - IAM roles for ECS

set -e

# Configuration
PROJECT_NAME="chirp-cms"
REGION="${AWS_REGION:-us-east-1}"
DB_NAME="chirp_cms"
DB_USERNAME="chirp"
DB_INSTANCE_CLASS="${DB_INSTANCE_CLASS:-db.t4g.micro}"  # Free tier eligible
USE_DEFAULT_VPC="${USE_DEFAULT_VPC:-true}"  # Set to false to create new VPC

echo "==========================================="
echo "CHIRP CMS Infrastructure Setup"
echo "==========================================="
echo "Project: $PROJECT_NAME"
echo "Region: $REGION"
echo "Using default VPC: $USE_DEFAULT_VPC"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Helper functions
log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check prerequisites
if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is not installed"
    exit 1
fi

if ! aws sts get-caller-identity --profile sberardelli &> /dev/null; then
    log_error "AWS credentials not configured"
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --profile sberardelli --query Account --output text)
log_info "AWS Account ID: $ACCOUNT_ID"

# ================================
# 1. VPC Setup
# ================================
echo ""
echo "Step 1: VPC Configuration"
echo "-------------------------------------------"

if [ "$USE_DEFAULT_VPC" = "true" ]; then
    log_info "Using default VPC..."
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=isDefault,Values=true" --query "Vpcs[0].VpcId" --output text --region $REGION --profile sberardelli)

    if [ "$VPC_ID" = "None" ]; then
        log_error "No default VPC found. Set USE_DEFAULT_VPC=false to create a new VPC"
        exit 1
    fi

    log_success "Default VPC: $VPC_ID"

    # Get default subnets
    SUBNETS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query "Subnets[*].SubnetId" --output text --region $REGION --profile sberardelli)
    SUBNET_1=$(echo $SUBNETS | awk '{print $1}')
    SUBNET_2=$(echo $SUBNETS | awk '{print $2}')

    log_success "Subnets: $SUBNET_1, $SUBNET_2"
else
    log_info "Creating new VPC..."
    # VPC creation would go here - omitted for brevity
    # In production, consider using CloudFormation or Terraform for VPC setup
    log_error "Custom VPC creation not implemented. Use default VPC or create manually."
    exit 1
fi

# ================================
# 2. Security Groups
# ================================
echo ""
echo "Step 2: Creating Security Groups"
echo "-------------------------------------------"

# Security group for ALB
log_info "Creating ALB security group..."
ALB_SG_ID=$(aws ec2 create-security-group \
    --group-name "${PROJECT_NAME}-alb-sg" \
    --description "Security group for CHIRP CMS ALB" \
    --vpc-id $VPC_ID \
    --region $REGION \
    --profile sberardelli \
    --query 'GroupId' \
    --output text 2>/dev/null || \
    aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=${PROJECT_NAME}-alb-sg" "Name=vpc-id,Values=$VPC_ID" \
        --query 'SecurityGroups[0].GroupId' \
        --output text \
        --region $REGION \
        --profile sberardelli)

# Allow HTTP and HTTPS to ALB
aws ec2 authorize-security-group-ingress \
    --group-id $ALB_SG_ID \
    --protocol tcp \
    --port 80 \
    --cidr 0.0.0.0/0 \
    --region $REGION \
    --profile sberardelli 2>/dev/null || true

aws ec2 authorize-security-group-ingress \
    --group-id $ALB_SG_ID \
    --protocol tcp \
    --port 443 \
    --cidr 0.0.0.0/0 \
    --region $REGION \
    --profile sberardelli 2>/dev/null || true

log_success "ALB Security Group: $ALB_SG_ID"

# Security group for ECS tasks
log_info "Creating ECS security group..."
ECS_SG_ID=$(aws ec2 create-security-group \
    --group-name "${PROJECT_NAME}-ecs-sg" \
    --description "Security group for CHIRP CMS ECS tasks" \
    --vpc-id $VPC_ID \
    --region $REGION \
    --profile sberardelli \
    --query 'GroupId' \
    --output text 2>/dev/null || \
    aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=${PROJECT_NAME}-ecs-sg" "Name=vpc-id,Values=$VPC_ID" \
        --query 'SecurityGroups[0].GroupId' \
        --output text \
        --region $REGION \
        --profile sberardelli)

# Allow traffic from ALB to ECS on port 3000
aws ec2 authorize-security-group-ingress \
    --group-id $ECS_SG_ID \
    --protocol tcp \
    --port 3000 \
    --source-group $ALB_SG_ID \
    --region $REGION \
    --profile sberardelli 2>/dev/null || true

log_success "ECS Security Group: $ECS_SG_ID"

# Security group for RDS
log_info "Creating RDS security group..."
RDS_SG_ID=$(aws ec2 create-security-group \
    --group-name "${PROJECT_NAME}-rds-sg" \
    --description "Security group for CHIRP CMS RDS" \
    --vpc-id $VPC_ID \
    --region $REGION \
    --profile sberardelli \
    --query 'GroupId' \
    --output text 2>/dev/null || \
    aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=${PROJECT_NAME}-rds-sg" "Name=vpc-id,Values=$VPC_ID" \
        --query 'SecurityGroups[0].GroupId' \
        --output text \
        --region $REGION \
        --profile sberardelli)

# Allow PostgreSQL from ECS
aws ec2 authorize-security-group-ingress \
    --group-id $RDS_SG_ID \
    --protocol tcp \
    --port 5432 \
    --source-group $ECS_SG_ID \
    --region $REGION \
    --profile sberardelli 2>/dev/null || true

log_success "RDS Security Group: $RDS_SG_ID"

# Security group for EFS
log_info "Creating EFS security group..."
EFS_SG_ID=$(aws ec2 create-security-group \
    --group-name "${PROJECT_NAME}-efs-sg" \
    --description "Security group for CHIRP CMS EFS" \
    --vpc-id $VPC_ID \
    --region $REGION \
    --profile sberardelli \
    --query 'GroupId' \
    --output text 2>/dev/null || \
    aws ec2 describe-security-groups \
        --filters "Name=group-name,Values=${PROJECT_NAME}-efs-sg" "Name=vpc-id,Values=$VPC_ID" \
        --query 'SecurityGroups[0].GroupId' \
        --output text \
        --region $REGION \
        --profile sberardelli)

# Allow NFS from ECS
aws ec2 authorize-security-group-ingress \
    --group-id $EFS_SG_ID \
    --protocol tcp \
    --port 2049 \
    --source-group $ECS_SG_ID \
    --region $REGION \
    --profile sberardelli 2>/dev/null || true

log_success "EFS Security Group: $EFS_SG_ID"

# ================================
# 3. RDS PostgreSQL Database
# ================================
echo ""
echo "Step 3: Creating RDS PostgreSQL Database"
echo "-------------------------------------------"

# Generate random password
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

# Create DB subnet group
log_info "Creating DB subnet group..."
aws rds create-db-subnet-group \
    --db-subnet-group-name "${PROJECT_NAME}-db-subnet-group" \
    --db-subnet-group-description "Subnet group for CHIRP CMS database" \
    --subnet-ids $SUBNET_1 $SUBNET_2 \
    --region $REGION \
    --profile sberardelli 2>/dev/null || log_info "DB subnet group already exists"

# Create RDS instance
log_info "Creating RDS PostgreSQL instance (this takes 5-10 minutes)..."
DB_INSTANCE_ID="${PROJECT_NAME}-db"

aws rds create-db-instance \
    --db-instance-identifier $DB_INSTANCE_ID \
    --db-instance-class $DB_INSTANCE_CLASS \
    --engine postgres \
    --engine-version 16.3 \
    --master-username $DB_USERNAME \
    --master-user-password "$DB_PASSWORD" \
    --allocated-storage 20 \
    --storage-type gp3 \
    --db-name $DB_NAME \
    --vpc-security-group-ids $RDS_SG_ID \
    --db-subnet-group-name "${PROJECT_NAME}-db-subnet-group" \
    --backup-retention-period 7 \
    --no-publicly-accessible \
    --region $REGION \
    --profile sberardelli 2>/dev/null || log_info "RDS instance already exists"

log_info "Waiting for RDS instance to be available..."
aws rds wait db-instance-available \
    --db-instance-identifier $DB_INSTANCE_ID \
    --region $REGION \
    --profile sberardelli

# Get RDS endpoint
DB_ENDPOINT=$(aws rds describe-db-instances \
    --db-instance-identifier $DB_INSTANCE_ID \
    --query 'DBInstances[0].Endpoint.Address' \
    --output text \
    --region $REGION \
    --profile sberardelli)

DATABASE_URI="postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_ENDPOINT}:5432/${DB_NAME}?sslmode=no-verify"

log_success "RDS Database created: $DB_ENDPOINT"

# Store database password in Secrets Manager
log_info "Storing database credentials in Secrets Manager..."
aws secretsmanager create-secret \
    --name "${PROJECT_NAME}/database-password" \
    --secret-string "$DB_PASSWORD" \
    --region $REGION \
    --profile sberardelli 2>/dev/null || \
    aws secretsmanager update-secret \
        --secret-id "${PROJECT_NAME}/database-password" \
        --secret-string "$DB_PASSWORD" \
        --region $REGION \
        --profile sberardelli

log_success "Database password stored in Secrets Manager"

# ================================
# 4. EFS File System
# ================================
echo ""
echo "Step 4: Creating EFS File System"
echo "-------------------------------------------"

log_info "Creating EFS file system..."
EFS_ID=$(aws efs create-file-system \
    --performance-mode generalPurpose \
    --throughput-mode bursting \
    --encrypted \
    --tags Key=Name,Value="${PROJECT_NAME}-media-storage" \
    --region $REGION \
    --profile sberardelli \
    --query 'FileSystemId' \
    --output text 2>/dev/null || \
    aws efs describe-file-systems \
        --region $REGION \
        --profile sberardelli \
        --query "FileSystems[?Tags[?Key=='Name' && Value=='${PROJECT_NAME}-media-storage']].FileSystemId" \
        --output text | head -1)

log_success "EFS File System: $EFS_ID"

# Wait for EFS to be available
log_info "Waiting for EFS to be available..."
aws efs describe-file-systems \
    --file-system-id $EFS_ID \
    --region $REGION \
    --profile sberardelli > /dev/null

# Create mount targets
log_info "Creating EFS mount targets..."
for SUBNET in $SUBNET_1 $SUBNET_2; do
    aws efs create-mount-target \
        --file-system-id $EFS_ID \
        --subnet-id $SUBNET \
        --security-groups $EFS_SG_ID \
        --region $REGION \
        --profile sberardelli 2>/dev/null || log_info "Mount target already exists for $SUBNET"
done

log_success "EFS mount targets created"

# ================================
# 5. Application Load Balancer
# ================================
echo ""
echo "Step 5: Creating Application Load Balancer"
echo "-------------------------------------------"

log_info "Creating ALB..."
ALB_ARN=$(aws elbv2 create-load-balancer \
    --name "${PROJECT_NAME}-alb" \
    --subnets $SUBNET_1 $SUBNET_2 \
    --security-groups $ALB_SG_ID \
    --scheme internet-facing \
    --type application \
    --ip-address-type ipv4 \
    --region $REGION \
    --profile sberardelli \
    --query 'LoadBalancers[0].LoadBalancerArn' \
    --output text 2>/dev/null || \
    aws elbv2 describe-load-balancers \
        --names "${PROJECT_NAME}-alb" \
        --region $REGION \
        --profile sberardelli \
        --query 'LoadBalancers[0].LoadBalancerArn' \
        --output text)

ALB_DNS=$(aws elbv2 describe-load-balancers \
    --load-balancer-arns $ALB_ARN \
    --query 'LoadBalancers[0].DNSName' \
    --output text \
    --region $REGION \
    --profile sberardelli)

log_success "ALB created: $ALB_DNS"

# Create target group
log_info "Creating target group..."
TG_ARN=$(aws elbv2 create-target-group \
    --name "${PROJECT_NAME}-tg" \
    --protocol HTTP \
    --port 3000 \
    --vpc-id $VPC_ID \
    --target-type ip \
    --health-check-enabled \
    --health-check-path /admin \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 10 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --region $REGION \
    --profile sberardelli \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text 2>/dev/null || \
    aws elbv2 describe-target-groups \
        --names "${PROJECT_NAME}-tg" \
        --region $REGION \
        --profile sberardelli \
        --query 'TargetGroups[0].TargetGroupArn' \
        --output text)

log_success "Target Group created"

# Create listener (HTTP)
log_info "Creating ALB listener..."
aws elbv2 create-listener \
    --load-balancer-arn $ALB_ARN \
    --protocol HTTP \
    --port 80 \
    --default-actions Type=forward,TargetGroupArn=$TG_ARN \
    --region $REGION \
    --profile sberardelli 2>/dev/null || log_info "Listener already exists"

log_success "ALB listener created"

# ================================
# 6. IAM Roles
# ================================
echo ""
echo "Step 6: Creating IAM Roles"
echo "-------------------------------------------"

# ECS Task Execution Role
log_info "Creating ECS task execution role..."
cat > /tmp/ecs-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

EXECUTION_ROLE_NAME="${PROJECT_NAME}-ecs-execution-role"
aws iam create-role \
    --role-name $EXECUTION_ROLE_NAME \
    --assume-role-policy-document file:///tmp/ecs-trust-policy.json \
    --profile sberardelli 2>/dev/null || log_info "Execution role already exists"

aws iam attach-role-policy \
    --role-name $EXECUTION_ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy \
    --profile sberardelli 2>/dev/null || true

# Add Secrets Manager access to execution role
cat > /tmp/execution-secrets-policy.json <<EXECEOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:${REGION}:${ACCOUNT_ID}:secret:${PROJECT_NAME}/*"
    }
  ]
}
EXECEOF

aws iam put-role-policy \
    --role-name $EXECUTION_ROLE_NAME \
    --policy-name SecretsManagerAccess \
    --policy-document file:///tmp/execution-secrets-policy.json \
    --profile sberardelli 2>/dev/null || true

# Add CloudWatch Logs access to execution role
cat > /tmp/execution-logs-policy.json <<LOGSEOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:${REGION}:${ACCOUNT_ID}:log-group:/ecs/${PROJECT_NAME}:*"
    }
  ]
}
LOGSEOF

aws iam put-role-policy \
    --role-name $EXECUTION_ROLE_NAME \
    --policy-name CloudWatchLogsAccess \
    --policy-document file:///tmp/execution-logs-policy.json \
    --profile sberardelli 2>/dev/null || true

EXECUTION_ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${EXECUTION_ROLE_NAME}"
log_success "Execution Role: $EXECUTION_ROLE_ARN"

# ECS Task Role (for application permissions)
TASK_ROLE_NAME="${PROJECT_NAME}-ecs-task-role"
aws iam create-role \
    --role-name $TASK_ROLE_NAME \
    --assume-role-policy-document file:///tmp/ecs-trust-policy.json \
    --profile sberardelli 2>/dev/null || log_info "Task role already exists"

# Policy for accessing Secrets Manager
cat > /tmp/task-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue"
      ],
      "Resource": "arn:aws:secretsmanager:${REGION}:${ACCOUNT_ID}:secret:${PROJECT_NAME}/*"
    }
  ]
}
EOF

aws iam put-role-policy \
    --role-name $TASK_ROLE_NAME \
    --policy-name SecretsManagerAccess \
    --policy-document file:///tmp/task-policy.json \
    --profile sberardelli 2>/dev/null || true

TASK_ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${TASK_ROLE_NAME}"
log_success "Task Role: $TASK_ROLE_ARN"

# ================================
# Output Configuration
# ================================
echo ""
echo "==========================================="
echo "✓ Infrastructure Setup Complete!"
echo "==========================================="
echo ""
echo "Save these values for the next steps:"
echo ""
echo "VPC_ID=$VPC_ID"
echo "SUBNET_1=$SUBNET_1"
echo "SUBNET_2=$SUBNET_2"
echo "ECS_SG_ID=$ECS_SG_ID"
echo "EFS_ID=$EFS_ID"
echo "ALB_ARN=$ALB_ARN"
echo "ALB_DNS=$ALB_DNS"
echo "TG_ARN=$TG_ARN"
echo "EXECUTION_ROLE_ARN=$EXECUTION_ROLE_ARN"
echo "TASK_ROLE_ARN=$TASK_ROLE_ARN"
echo "DATABASE_URI=$DATABASE_URI"
echo ""

# Save configuration to file
cat > ../infrastructure-config.env <<EOF
# AWS Infrastructure Configuration
# Generated on $(date)

AWS_REGION=$REGION
AWS_ACCOUNT_ID=$ACCOUNT_ID

VPC_ID=$VPC_ID
SUBNET_1=$SUBNET_1
SUBNET_2=$SUBNET_2

ECS_SG_ID=$ECS_SG_ID
EFS_SG_ID=$EFS_SG_ID
RDS_SG_ID=$RDS_SG_ID
ALB_SG_ID=$ALB_SG_ID

EFS_ID=$EFS_ID
ALB_ARN=$ALB_ARN
ALB_DNS=$ALB_DNS
TG_ARN=$TG_ARN

EXECUTION_ROLE_ARN=$EXECUTION_ROLE_ARN
TASK_ROLE_ARN=$TASK_ROLE_ARN

DATABASE_URI=$DATABASE_URI
DB_ENDPOINT=$DB_ENDPOINT
DB_USERNAME=$DB_USERNAME
DB_NAME=$DB_NAME
EOF

log_success "Configuration saved to: ../infrastructure-config.env"
echo ""
echo "Next steps:"
echo "1. Review the configuration file"
echo "2. Create ECS cluster: ./scripts/04-create-ecs-cluster.sh"
echo "3. Deploy application: ./scripts/05-deploy-to-ecs.sh"
