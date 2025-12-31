#!/bin/bash

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "════════════════════════════════════════════════════════"
echo "🔒 BAC/IDOR Security Test Runner - STAGING"
echo "════════════════════════════════════════════════════════"
echo ""

# Check if JWT_SECRET is provided
if [ -z "$JWT_SECRET" ]; then
  echo -e "${RED}❌ ERROR: JWT_SECRET not set${NC}"
  echo ""
  echo "Please set the JWT_SECRET environment variable:"
  echo ""
  echo -e "${YELLOW}export JWT_SECRET=\"your-staging-jwt-secret-here\"${NC}"
  echo ""
  echo "Get it from: https://dashboard.render.com/web/srv-d4vr77i4d50c73871ps0"
  echo "Navigate to: Environment tab → JWT_SECRET → Click eye icon"
  echo ""
  exit 1
fi

# Set staging database URL
export STAGING_DATABASE_URL="postgresql://feedbackflow:LWs7qvVeNmKTdxnfcOEcmH7LdbYhvyoT@dpg-d4vqugu3jp1c73er20sg-a.frankfurt-postgres.render.com/feedbackflow_staging"

echo -e "${GREEN}✓ JWT_SECRET is set${NC}"
echo -e "${GREEN}✓ STAGING_DATABASE_URL is set${NC}"
echo ""
echo "Running security tests against staging..."
echo ""

# Run the test
node scripts/test-bac-idor-staging.js

echo ""
echo "════════════════════════════════════════════════════════"
