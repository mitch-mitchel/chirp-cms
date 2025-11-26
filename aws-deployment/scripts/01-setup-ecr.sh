#!/bin/bash

# ================================
# Setup ECR Repository for CHIRP CMS
# ================================
# This script creates an ECR repository to store your Docker images

set -e

# Configuration
REPOSITORY_NAME="chirp-cms"
REGION="${AWS_REGION:-us-east-1}"

echo "==========================================="
echo "Setting up ECR Repository"
echo "==========================================="
echo "Repository: $REPOSITORY_NAME"
echo "Region: $REGION"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "Error: AWS CLI is not installed"
    echo "Install it from: https://aws.amazon.com/cli/"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity --profile sberardelli &> /dev/null; then
    echo "Error: AWS credentials not configured"
    echo "Run: aws configure"
    exit 1
fi

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --profile sberardelli --query Account --output text)
echo "AWS Account ID: $ACCOUNT_ID"
echo ""

# Create ECR repository if it doesn't exist
echo "Creating ECR repository..."
if aws ecr describe-repositories --repository-names $REPOSITORY_NAME --region $REGION --profile sberardelli &> /dev/null; then
    echo "✓ Repository already exists"
else
    aws ecr create-repository \
        --repository-name $REPOSITORY_NAME \
        --region $REGION \
        --profile sberardelli \
        --image-scanning-configuration scanOnPush=true \
        --encryption-configuration encryptionType=AES256
    echo "✓ Repository created"
fi

# Set lifecycle policy to keep only last 10 images
echo ""
echo "Setting lifecycle policy..."
cat > /tmp/ecr-lifecycle-policy.json <<EOF
{
  "rules": [
    {
      "rulePriority": 1,
      "description": "Keep last 10 images",
      "selection": {
        "tagStatus": "any",
        "countType": "imageCountMoreThan",
        "countNumber": 10
      },
      "action": {
        "type": "expire"
      }
    }
  ]
}
EOF

aws ecr put-lifecycle-policy \
    --repository-name $REPOSITORY_NAME \
    --region $REGION \
    --profile sberardelli \
    --lifecycle-policy-text file:///tmp/ecr-lifecycle-policy.json

echo "✓ Lifecycle policy set"

# Display repository URI
REPOSITORY_URI="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPOSITORY_NAME"
echo ""
echo "==========================================="
echo "✓ ECR Setup Complete"
echo "==========================================="
echo "Repository URI: $REPOSITORY_URI"
echo ""
echo "Next steps:"
echo "1. Build and push your Docker image using: ./scripts/02-build-and-push.sh"
echo "2. Set up AWS infrastructure using: ./scripts/03-setup-infrastructure.sh"
