#!/bin/bash

# ================================
# Migrate SQLite to AWS RDS via ECS Task
# ================================
# This script:
# 1. Uploads the SQLite database to S3
# 2. Runs a one-off ECS task to perform the migration
# 3. Downloads the migration logs

set -e

# Configuration
PROJECT_NAME="chirp-cms"
REGION="${AWS_REGION:-us-east-1}"
AWS_PROFILE="${AWS_PROFILE:-sberardelli}"
SQLITE_DB_PATH="./data-backups/payload.db"
S3_BUCKET="${PROJECT_NAME}-migration-$(date +%s)"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_info() { echo -e "${YELLOW}ℹ${NC} $1"; }
log_error() { echo -e "${RED}✗${NC} $1"; }

echo "==========================================="
echo "CHIRP CMS - Migrate to AWS RDS via ECS"
echo "==========================================="
echo ""

# Check prerequisites
if [ ! -f "$SQLITE_DB_PATH" ]; then
    log_error "SQLite database not found at: $SQLITE_DB_PATH"
    exit 1
fi

if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is not installed"
    exit 1
fi

# Load infrastructure config
if [ -f "./infrastructure-config.env" ]; then
    source ./infrastructure-config.env
    log_success "Loaded infrastructure configuration"
else
    log_error "infrastructure-config.env not found. Run setup scripts first."
    exit 1
fi

# Step 1: Create temporary S3 bucket for the migration
log_info "Creating temporary S3 bucket for migration..."
aws s3 mb s3://${S3_BUCKET} --region ${REGION} --profile ${AWS_PROFILE} 2>/dev/null || true
log_success "S3 bucket ready: ${S3_BUCKET}"

# Step 2: Upload SQLite database to S3
log_info "Uploading SQLite database to S3..."
aws s3 cp ${SQLITE_DB_PATH} s3://${S3_BUCKET}/payload.db --region ${REGION} --profile ${AWS_PROFILE}
log_success "Database uploaded"

# Step 3: Get ECS cluster and task details
CLUSTER_NAME="${PROJECT_NAME}-cluster"
TASK_DEF_NAME="${PROJECT_NAME}-task"

log_info "Getting ECS task definition..."
TASK_DEF_ARN=$(aws ecs describe-task-definition \
    --task-definition ${TASK_DEF_NAME} \
    --region ${REGION} \
    --profile ${AWS_PROFILE} \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)

if [ -z "$TASK_DEF_ARN" ]; then
    log_error "ECS task definition not found. Deploy the application first."
    exit 1
fi

log_success "Found task definition: ${TASK_DEF_ARN}"

# Step 4: Run migration task
log_info "Starting migration ECS task..."
log_info "This will run the migration script inside your ECS cluster..."

TASK_ARN=$(aws ecs run-task \
    --cluster ${CLUSTER_NAME} \
    --task-definition ${TASK_DEF_NAME} \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[${SUBNET_1},${SUBNET_2}],securityGroups=[${ECS_SG_ID}],assignPublicIp=ENABLED}" \
    --overrides "{
        \"containerOverrides\": [{
            \"name\": \"${PROJECT_NAME}\",
            \"command\": [\"/bin/sh\", \"-c\", \"aws s3 cp s3://${S3_BUCKET}/payload.db /tmp/payload.db && npm run migrate:to-rds\"]
        }]
    }" \
    --region ${REGION} \
    --profile ${AWS_PROFILE} \
    --query 'tasks[0].taskArn' \
    --output text)

log_success "Migration task started: ${TASK_ARN}"
log_info "Waiting for task to complete (this may take several minutes)..."

# Wait for task to complete
aws ecs wait tasks-stopped \
    --cluster ${CLUSTER_NAME} \
    --tasks ${TASK_ARN} \
    --region ${REGION} \
    --profile ${AWS_PROFILE}

# Check task exit code
EXIT_CODE=$(aws ecs describe-tasks \
    --cluster ${CLUSTER_NAME} \
    --tasks ${TASK_ARN} \
    --region ${REGION} \
    --profile ${AWS_PROFILE} \
    --query 'tasks[0].containers[0].exitCode' \
    --output text)

if [ "$EXIT_CODE" = "0" ]; then
    log_success "Migration completed successfully!"
else
    log_error "Migration failed with exit code: ${EXIT_CODE}"
    log_info "Check CloudWatch logs for details:"
    echo "   aws logs tail /ecs/${PROJECT_NAME} --follow --region ${REGION} --profile ${AWS_PROFILE}"
    exit 1
fi

# Step 5: Cleanup
log_info "Cleaning up temporary S3 bucket..."
aws s3 rm s3://${S3_BUCKET}/payload.db --region ${REGION} --profile ${AWS_PROFILE}
aws s3 rb s3://${S3_BUCKET} --region ${REGION} --profile ${AWS_PROFILE}
log_success "Cleanup complete"

echo ""
echo "==========================================="
echo "✓ Migration Complete!"
echo "==========================================="
echo ""
echo "Your data has been migrated to AWS RDS PostgreSQL"
echo "Access your application at: http://${ALB_DNS}"
echo ""
