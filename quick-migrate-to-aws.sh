#!/bin/bash

# ================================
# Quick Migration to AWS RDS
# ================================
# This script temporarily enables public access to RDS,
# runs the migration, then disables it again.

set -e

# Configuration
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
log_error() { echo -e "${RED}✗${NC} $1"; }

echo "==========================================="
echo "Quick Migration to AWS RDS PostgreSQL"
echo "==========================================="
echo ""
echo "⚠️  This script will:"
echo "   1. Temporarily make RDS publicly accessible"
echo "   2. Add your IP to the security group"
echo "   3. Run the migration"
echo "   4. Restore security settings"
echo ""
echo "Press Ctrl+C within 5 seconds to cancel..."
sleep 5

# Step 1: Enable public access
log_info "Step 1: Enabling public access to RDS..."
aws rds modify-db-instance \
    --db-instance-identifier $DB_INSTANCE \
    --publicly-accessible \
    --apply-immediately \
    --region $REGION \
    --profile $PROFILE > /dev/null

log_success "Public access requested"

# Step 2: Add your IP to security group
log_info "Step 2: Getting your public IP..."
MY_IP=$(curl -s https://checkip.amazonaws.com)
log_success "Your IP: $MY_IP"

log_info "Adding your IP to RDS security group..."
aws ec2 authorize-security-group-ingress \
    --group-id $RDS_SG_ID \
    --protocol tcp \
    --port 5432 \
    --cidr ${MY_IP}/32 \
    --region $REGION \
    --profile $PROFILE 2>/dev/null || log_info "IP already authorized"

log_success "IP authorized"

# Step 3: Wait for RDS to be available
log_info "Step 3: Waiting for RDS modifications to complete (2-5 minutes)..."
echo "   This may take a few minutes, please be patient..."
aws rds wait db-instance-available \
    --db-instance-identifier $DB_INSTANCE \
    --region $REGION \
    --profile $PROFILE

log_success "RDS is ready"

# Step 4: Run migration
log_info "Step 4: Running migration script (Payload API method)..."
echo ""
echo "========================================"
npm run migrate:to-rds-api
echo "========================================"
echo ""

# Step 5: Disable public access
log_info "Step 5: Disabling public access..."
aws rds modify-db-instance \
    --db-instance-identifier $DB_INSTANCE \
    --no-publicly-accessible \
    --apply-immediately \
    --region $REGION \
    --profile $PROFILE > /dev/null

log_success "Public access disabled"

# Step 6: Remove IP from security group
log_info "Step 6: Removing your IP from security group..."
aws ec2 revoke-security-group-ingress \
    --group-id $RDS_SG_ID \
    --protocol tcp \
    --port 5432 \
    --cidr ${MY_IP}/32 \
    --region $REGION \
    --profile $PROFILE 2>/dev/null || true

log_success "IP removed"

echo ""
echo "==========================================="
echo "✓ Migration Complete!"
echo "==========================================="
echo ""
echo "Your data has been migrated to AWS RDS PostgreSQL"
echo "Security settings have been restored"
echo ""
echo "Next steps:"
echo "  1. Access your app at: http://${ALB_DNS}"
echo "  2. Verify your data in the admin panel"
echo ""
