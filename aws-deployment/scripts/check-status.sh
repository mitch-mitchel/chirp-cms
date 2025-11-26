#!/bin/bash

# ================================
# Check Deployment Status
# ================================

PROJECT_NAME="chirp-cms"
REGION="${AWS_REGION:-us-east-1}"
CLUSTER_NAME="${PROJECT_NAME}-cluster"
SERVICE_NAME="${PROJECT_NAME}-service"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo "==========================================="
echo "CHIRP CMS Deployment Status"
echo "==========================================="
echo ""

# Check ECS Service
echo "ECS Service Status:"
echo "-------------------------------------------"
SERVICE_STATUS=$(aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --region $REGION \
  --profile sberardelli \
  --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,Pending:pendingCount}' \
  --output table 2>/dev/null)

if [ $? -eq 0 ]; then
  echo "$SERVICE_STATUS"
else
  echo -e "${RED}✗ Service not found${NC}"
fi

echo ""

# Check Running Tasks
echo "Running Tasks:"
echo "-------------------------------------------"
TASKS=$(aws ecs list-tasks \
  --cluster $CLUSTER_NAME \
  --service-name $SERVICE_NAME \
  --region $REGION \
  --profile sberardelli \
  --query 'taskArns' \
  --output text 2>/dev/null)

if [ ! -z "$TASKS" ]; then
  for TASK in $TASKS; do
    TASK_INFO=$(aws ecs describe-tasks \
      --cluster $CLUSTER_NAME \
      --tasks $TASK \
      --region $REGION \
      --profile sberardelli \
      --query 'tasks[0].{Status:lastStatus,Health:healthStatus,Started:startedAt}' \
      --output table)
    echo "$TASK_INFO"
  done
else
  echo -e "${YELLOW}No running tasks${NC}"
fi

echo ""

# Check Target Group Health
echo "Load Balancer Target Health:"
echo "-------------------------------------------"

# Load infrastructure config
if [ -f "aws-deployment/infrastructure-config.env" ]; then
  source aws-deployment/infrastructure-config.env

  HEALTH=$(aws elbv2 describe-target-health \
    --target-group-arn $TG_ARN \
    --region $REGION \
    --profile sberardelli \
    --query 'TargetHealthDescriptions[*].{Target:Target.Id,Port:Target.Port,State:TargetHealth.State,Reason:TargetHealth.Reason}' \
    --output table 2>/dev/null)

  if [ $? -eq 0 ]; then
    echo "$HEALTH"
  else
    echo -e "${RED}✗ Could not retrieve target health${NC}"
  fi
else
  echo -e "${YELLOW}Configuration file not found${NC}"
fi

echo ""
echo "==========================================="
echo "To view logs: ./scripts/view-logs.sh"
echo "==========================================="
