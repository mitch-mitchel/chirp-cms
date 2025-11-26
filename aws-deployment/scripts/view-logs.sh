#!/bin/bash

# ================================
# View ECS Application Logs
# ================================

REGION="${AWS_REGION:-us-east-1}"
LOG_GROUP="/ecs/chirp-cms"

echo "Viewing logs from $LOG_GROUP"
echo "Press Ctrl+C to exit"
echo ""

aws logs tail $LOG_GROUP \
  --follow \
  --format short \
  --region $REGION \
  --profile sberardelli
