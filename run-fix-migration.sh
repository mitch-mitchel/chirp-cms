#!/bin/bash

# ================================
# Fix and Migrate Remaining Collections
# ================================

set -e

source infrastructure-config.env

REGION="${AWS_REGION:-us-east-1}"
PROFILE="sberardelli"
DB_INSTANCE="chirp-cms-db"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_success() { echo -e "${GREEN}✓${NC} $1"; }
log_info() { echo -e "${YELLOW}ℹ${NC} $1"; }

echo "==========================================="
echo "Fix Slug Issues & Migrate Remaining Data"
echo "==========================================="
echo ""

# Step 1: Enable public access (if needed)
log_info "Checking RDS accessibility..."
PUBLIC_ACCESS=$(aws rds describe-db-instances \
    --db-instance-identifier $DB_INSTANCE \
    --region $REGION \
    --profile $PROFILE \
    --query 'DBInstances[0].PubliclyAccessible' \
    --output text)

if [ "$PUBLIC_ACCESS" != "True" ]; then
    log_info "Enabling public access..."
    aws rds modify-db-instance \
        --db-instance-identifier $DB_INSTANCE \
        --publicly-accessible \
        --apply-immediately \
        --region $REGION \
        --profile $PROFILE > /dev/null

    log_info "Adding your IP to security group..."
    MY_IP=$(curl -s https://checkip.amazonaws.com)
    aws ec2 authorize-security-group-ingress \
        --group-id $RDS_SG_ID \
        --protocol tcp \
        --port 5432 \
        --cidr ${MY_IP}/32 \
        --region $REGION \
        --profile $PROFILE 2>/dev/null || log_info "IP already authorized"

    log_info "Waiting for RDS to be ready..."
    aws rds wait db-instance-available \
        --db-instance-identifier $DB_INSTANCE \
        --region $REGION \
        --profile $PROFILE

    log_success "RDS is accessible"
else
    log_success "RDS is already publicly accessible"
fi

# Step 2: Run migration
log_info "Running direct SQL migration (bypassing validation)..."
echo ""
npm run migrate:direct-sql

# Step 3: Restore security (if we enabled it)
if [ "$PUBLIC_ACCESS" != "True" ]; then
    log_info "Restoring security settings..."
    aws rds modify-db-instance \
        --db-instance-identifier $DB_INSTANCE \
        --no-publicly-accessible \
        --apply-immediately \
        --region $REGION \
        --profile $PROFILE > /dev/null

    MY_IP=$(curl -s https://checkip.amazonaws.com)
    aws ec2 revoke-security-group-ingress \
        --group-id $RDS_SG_ID \
        --protocol tcp \
        --port 5432 \
        --cidr ${MY_IP}/32 \
        --region $REGION \
        --profile $PROFILE 2>/dev/null || true

    log_success "Security restored"
fi

echo ""
echo "==========================================="
echo "✓ Complete!"
echo "==========================================="
