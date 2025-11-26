#!/bin/bash

# ================================
# Rollback to Previous Task Definition
# ================================

PROJECT_NAME="chirp-cms"
REGION="${AWS_REGION:-us-east-1}"
CLUSTER_NAME="${PROJECT_NAME}-cluster"
SERVICE_NAME="${PROJECT_NAME}-service"

echo "==========================================="
echo "Rollback ECS Service"
echo "==========================================="
echo ""

# Get current task definition
CURRENT_TASK_DEF=$(aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --region $REGION \
  --profile sberardelli \
  --query 'services[0].taskDefinition' \
  --output text)

echo "Current task definition: $CURRENT_TASK_DEF"
echo ""

# List recent task definitions
echo "Recent task definitions:"
aws ecs list-task-definitions \
  --family-prefix $PROJECT_NAME \
  --sort DESC \
  --max-items 5 \
  --region $REGION \
  --profile sberardelli \
  --query 'taskDefinitionArns' \
  --output table

echo ""
read -p "Enter the task definition ARN to rollback to: " ROLLBACK_TASK_DEF

if [ -z "$ROLLBACK_TASK_DEF" ]; then
  echo "No task definition provided. Exiting."
  exit 1
fi

echo ""
echo "Rolling back to: $ROLLBACK_TASK_DEF"
read -p "Are you sure? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo "Rollback cancelled."
  exit 0
fi

# Update service with previous task definition
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --task-definition $ROLLBACK_TASK_DEF \
  --force-new-deployment \
  --region $REGION \
  --profile sberardelli

echo ""
echo "✓ Rollback initiated"
echo "Monitor progress: ./scripts/check-status.sh"
