#!/bin/bash

# ================================
# Deploy CHIRP CMS to ECS
# ================================
# This script:
# 1. Loads infrastructure configuration
# 2. Creates/updates secrets in Secrets Manager
# 3. Registers ECS task definition
# 4. Creates or updates ECS service

set -e

PROJECT_NAME="chirp-cms"
REGION="${AWS_REGION:-us-east-1}"
CLUSTER_NAME="${PROJECT_NAME}-cluster"
SERVICE_NAME="${PROJECT_NAME}-service"

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_info() { echo -e "${YELLOW}ℹ${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

echo "==========================================="
echo "Deploying CHIRP CMS to ECS"
echo "==========================================="
echo ""

# ================================
# 1. Load Configuration
# ================================
CONFIG_FILE="infrastructure-config.env"

if [ ! -f "$CONFIG_FILE" ]; then
    log_error "Configuration file not found: $CONFIG_FILE"
    echo "Run ./scripts/03-setup-infrastructure.sh first"
    exit 1
fi

log_info "Loading configuration from $CONFIG_FILE"
source "$CONFIG_FILE"

# Get Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --profile sberardelli --query Account --output text)

# ================================
# 2. Collect Required Secrets
# ================================
echo ""
echo "Step 1: Configure Secrets"
echo "-------------------------------------------"

# Generate PAYLOAD_SECRET if not provided
if [ -z "$PAYLOAD_SECRET" ]; then
    PAYLOAD_SECRET=$(openssl rand -base64 48)
    log_info "Generated new PAYLOAD_SECRET"
fi

# Prompt for required values
read -p "Enter your production domain (e.g., cms.chirpradio.org): " PRODUCTION_DOMAIN
PAYLOAD_PUBLIC_SERVER_URL="https://${PRODUCTION_DOMAIN}"

read -p "Enter your frontend URL (e.g., https://www.chirpradio.org): " FRONTEND_URL

read -p "Enter your Resend API key (or press Enter to skip): " RESEND_API_KEY
read -p "Enter your OpenAI API key (or press Enter to skip): " OPENAI_API_KEY

# Store secrets in Secrets Manager
log_info "Storing secrets in AWS Secrets Manager..."

# Store PAYLOAD_SECRET
aws secretsmanager create-secret \
    --name "${PROJECT_NAME}/payload-secret" \
    --secret-string "$PAYLOAD_SECRET" \
    --region $REGION \
    --profile sberardelli 2>/dev/null || \
    aws secretsmanager update-secret \
        --secret-id "${PROJECT_NAME}/payload-secret" \
        --secret-string "$PAYLOAD_SECRET" \
        --region $REGION \
        --profile sberardelli

log_success "PAYLOAD_SECRET stored"

# Store RESEND_API_KEY if provided
if [ ! -z "$RESEND_API_KEY" ]; then
    aws secretsmanager create-secret \
        --name "${PROJECT_NAME}/resend-api-key" \
        --secret-string "$RESEND_API_KEY" \
        --region $REGION \
        --profile sberardelli 2>/dev/null || \
        aws secretsmanager update-secret \
            --secret-id "${PROJECT_NAME}/resend-api-key" \
            --secret-string "$RESEND_API_KEY" \
            --region $REGION \
            --profile sberardelli
    log_success "RESEND_API_KEY stored"
else
    log_info "Skipping RESEND_API_KEY (not provided)"
fi

# Store OPENAI_API_KEY if provided
if [ ! -z "$OPENAI_API_KEY" ]; then
    aws secretsmanager create-secret \
        --name "${PROJECT_NAME}/openai-api-key" \
        --secret-string "$OPENAI_API_KEY" \
        --region $REGION \
        --profile sberardelli 2>/dev/null || \
        aws secretsmanager update-secret \
            --secret-id "${PROJECT_NAME}/openai-api-key" \
            --secret-string "$OPENAI_API_KEY" \
            --region $REGION \
            --profile sberardelli
    log_success "OPENAI_API_KEY stored"
else
    log_info "Skipping OPENAI_API_KEY (not provided)"
fi

# ================================
# 3. Register Task Definition
# ================================
echo ""
echo "Step 2: Register ECS Task Definition"
echo "-------------------------------------------"

# Get ECR image URI
REPOSITORY_NAME="chirp-cms"
IMAGE_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${REPOSITORY_NAME}:latest"

log_info "Using image: $IMAGE_URI"

# Create task definition from template
TASK_DEF_TEMPLATE="ecs/task-definition-template.json"
TASK_DEF_FILE="/tmp/chirp-cms-task-definition.json"

# Replace placeholders in template
sed -e "s|\${EXECUTION_ROLE_ARN}|${EXECUTION_ROLE_ARN}|g" \
    -e "s|\${TASK_ROLE_ARN}|${TASK_ROLE_ARN}|g" \
    -e "s|\${IMAGE_URI}|${IMAGE_URI}|g" \
    -e "s|\${PAYLOAD_PUBLIC_SERVER_URL}|${PAYLOAD_PUBLIC_SERVER_URL}|g" \
    -e "s|\${DATABASE_URI}|${DATABASE_URI}|g" \
    -e "s|\${PAYLOAD_SECRET}|${PAYLOAD_SECRET}|g" \
    -e "s|\${FRONTEND_URL}|${FRONTEND_URL}|g" \
    -e "s|\${AWS_REGION}|${REGION}|g" \
    -e "s|\${AWS_ACCOUNT_ID}|${ACCOUNT_ID}|g" \
    -e "s|\${PROJECT_NAME}|${PROJECT_NAME}|g" \
    -e "s|\${EFS_ID}|${EFS_ID}|g" \
    "$TASK_DEF_TEMPLATE" > "$TASK_DEF_FILE"

# Register task definition
log_info "Registering task definition..."
TASK_DEF_ARN=$(aws ecs register-task-definition \
    --cli-input-json file://"$TASK_DEF_FILE" \
    --region $REGION \
    --profile sberardelli \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)

log_success "Task definition registered: $TASK_DEF_ARN"

# ================================
# 4. Create or Update ECS Service
# ================================
echo ""
echo "Step 3: Create/Update ECS Service"
echo "-------------------------------------------"

# Check if service exists
SERVICE_EXISTS=$(aws ecs describe-services \
    --cluster $CLUSTER_NAME \
    --services $SERVICE_NAME \
    --region $REGION \
    --profile sberardelli \
    --query 'services[0].serviceName' \
    --output text 2>/dev/null || echo "None")

if [ "$SERVICE_EXISTS" = "None" ] || [ "$SERVICE_EXISTS" = "" ]; then
    log_info "Creating new ECS service..."

    aws ecs create-service \
        --cluster $CLUSTER_NAME \
        --service-name $SERVICE_NAME \
        --task-definition $TASK_DEF_ARN \
        --desired-count 1 \
        --launch-type FARGATE \
        --platform-version LATEST \
        --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1,$SUBNET_2],securityGroups=[$ECS_SG_ID],assignPublicIp=ENABLED}" \
        --load-balancers "targetGroupArn=$TG_ARN,containerName=chirp-cms,containerPort=3000" \
        --health-check-grace-period-seconds 60 \
        --region $REGION \
        --profile sberardelli > /dev/null

    log_success "ECS service created"
else
    log_info "Updating existing ECS service..."

    aws ecs update-service \
        --cluster $CLUSTER_NAME \
        --service $SERVICE_NAME \
        --task-definition $TASK_DEF_ARN \
        --force-new-deployment \
        --region $REGION \
        --profile sberardelli > /dev/null

    log_success "ECS service updated"
fi

# ================================
# 5. Wait for Service to be Stable
# ================================
echo ""
echo "Step 4: Waiting for Service Deployment"
echo "-------------------------------------------"

log_info "Waiting for service to reach steady state (this may take 3-5 minutes)..."
log_info "You can press Ctrl+C to stop waiting (deployment will continue)"

aws ecs wait services-stable \
    --cluster $CLUSTER_NAME \
    --services $SERVICE_NAME \
    --region $REGION \
    --profile sberardelli || log_info "Wait interrupted or timed out"

# ================================
# Output Deployment Info
# ================================
echo ""
echo "==========================================="
echo "✓ Deployment Complete!"
echo "==========================================="
echo ""
echo "Your application is being deployed to:"
echo "  Load Balancer: http://$ALB_DNS"
echo "  Production URL: $PAYLOAD_PUBLIC_SERVER_URL"
echo ""
echo "Admin Panel: ${PAYLOAD_PUBLIC_SERVER_URL}/admin"
echo ""
echo "Next steps:"
echo "1. Point your domain ($PRODUCTION_DOMAIN) to the Load Balancer DNS"
echo "2. Set up HTTPS certificate in AWS Certificate Manager"
echo "3. Add HTTPS listener to the Load Balancer"
echo "4. Access your admin panel and create the first admin user"
echo ""
echo "To check service status:"
echo "  aws ecs describe-services --cluster $CLUSTER_NAME --services $SERVICE_NAME --region $REGION"
echo ""
echo "To view logs:"
echo "  aws logs tail /ecs/chirp-cms --follow --region $REGION"
