#!/bin/bash

echo "🧪 Testing migration script locally..."
echo ""
echo "This will test the migration against your local PostgreSQL"
echo "to verify it works before running against AWS RDS"
echo ""
echo "Press Ctrl+C to cancel, or Enter to continue..."
read

# Use local PostgreSQL
export DATABASE_URI="postgresql://chirp:chirp_dev_password@localhost:5432/chirp_cms"

npm run migrate:to-rds-api
