#!/bin/bash

# ================================
# Create ECS Cluster
# ================================

set -e

PROJECT_NAME="chirp-cms"
REGION="${AWS_REGION:-us-east-1}"

echo "==========================================="
echo "Creating ECS Cluster"
echo "==========================================="
echo "Cluster: ${PROJECT_NAME}-cluster"
echo "Region: $REGION"
echo ""

# Create ECS cluster
aws ecs create-cluster \
    --cluster-name "${PROJECT_NAME}-cluster" \
    --capacity-providers FARGATE FARGATE_SPOT \
    --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1 \
    --region $REGION \
    --profile sberardelli 2>/dev/null || echo "✓ Cluster already exists"

echo ""
echo "✓ ECS Cluster created: ${PROJECT_NAME}-cluster"
echo ""
echo "Next step: Deploy application with ./scripts/05-deploy-to-ecs.sh"
