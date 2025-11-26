#!/bin/bash

# ================================
# Build and Push Docker Image to ECR
# ================================
# This script builds the Docker image and pushes it to ECR

set -e

# Configuration
REPOSITORY_NAME="chirp-cms"
REGION="${AWS_REGION:-us-east-1}"
IMAGE_TAG="${IMAGE_TAG:-latest}"

echo "==========================================="
echo "Building and Pushing Docker Image"
echo "==========================================="
echo "Repository: $REPOSITORY_NAME"
echo "Region: $REGION"
echo "Tag: $IMAGE_TAG"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running"
    exit 1
fi

# Get AWS Account ID
ACCOUNT_ID=$(aws sts get-caller-identity --profile sberardelli --query Account --output text)
REPOSITORY_URI="$ACCOUNT_ID.dkr.ecr.$REGION.amazonaws.com/$REPOSITORY_NAME"

echo "Repository URI: $REPOSITORY_URI"
echo ""

# Authenticate Docker to ECR
echo "Authenticating to ECR..."
aws ecr get-login-password --region $REGION --profile sberardelli | docker login --username AWS --password-stdin $REPOSITORY_URI
echo "✓ Authenticated to ECR"
echo ""

# Build Docker image
echo "Building Docker image..."
cd "$(dirname "$0")/../.."  # Go to project root

docker build \
    --platform linux/amd64 \
    -t $REPOSITORY_NAME:$IMAGE_TAG \
    -f Dockerfile \
    .

echo "✓ Image built successfully"
echo ""

# Tag image for ECR
echo "Tagging image..."
docker tag $REPOSITORY_NAME:$IMAGE_TAG $REPOSITORY_URI:$IMAGE_TAG

# Also tag as latest if not already
if [ "$IMAGE_TAG" != "latest" ]; then
    docker tag $REPOSITORY_NAME:$IMAGE_TAG $REPOSITORY_URI:latest
fi

echo "✓ Image tagged"
echo ""

# Push to ECR
echo "Pushing image to ECR..."
docker push $REPOSITORY_URI:$IMAGE_TAG

if [ "$IMAGE_TAG" != "latest" ]; then
    docker push $REPOSITORY_URI:latest
fi

echo "✓ Image pushed successfully"
echo ""

# Get image digest
IMAGE_DIGEST=$(aws ecr describe-images \
    --repository-name $REPOSITORY_NAME \
    --image-ids imageTag=$IMAGE_TAG \
    --region $REGION \
    --profile sberardelli \
    --query 'imageDetails[0].imageDigest' \
    --output text)

echo "==========================================="
echo "✓ Build and Push Complete!"
echo "==========================================="
echo "Image URI: $REPOSITORY_URI:$IMAGE_TAG"
echo "Image Digest: $IMAGE_DIGEST"
echo ""
echo "Next steps:"
echo "1. If infrastructure is not set up, run: ./scripts/03-setup-infrastructure.sh"
echo "2. Deploy to ECS: ./scripts/05-deploy-to-ecs.sh"
