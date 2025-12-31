#!/bin/bash

##############################################
# Security Fix Penetration Test
# 
# This script attempts to exploit the staging
# environment to verify the security fix works.
#
# Date: December 22, 2024
# Vulnerability: Privilege escalation
##############################################

# Don't exit on errors - we want to test all attacks
# set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================"
echo "🔴 SECURITY PENETRATION TEST - PRODUCTION"
echo "Testing: feedbackflow-backend.onrender.com"
echo "Frontend: growthpulse.team"
echo "Date: $(date)"
echo "============================================"
echo ""

# Check if production is up
echo "📡 Checking production backend health..."
HEALTH=$(curl -s https://feedbackflow-backend.onrender.com/api/v1/health)
if [[ $HEALTH == *"healthy"* ]]; then
  echo -e "${GREEN}✓ Production is healthy${NC}"
else
  echo -e "${RED}✗ Production is not responding${NC}"
  exit 1
fi
echo ""

# Check for required variables
if [ -z "$ADMIN_TOKEN" ] || [ -z "$ORG_ID" ]; then
  echo -e "${YELLOW}⚠️  CREDENTIALS REQUIRED${NC}"
  echo ""
  echo "To run this penetration test, you need:"
  echo "  1. Admin user token (NOT super_admin)"
  echo "  2. Organization ID"
  echo ""
  echo "How to get them:"
  echo "  1. Login to https://growthpulse.team"
  echo "  2. Open DevTools → Network tab"
  echo "  3. Make any API request"
  echo "  4. Copy the 'Authorization: Bearer xxx' token"
  echo "  5. Copy your organization ID from profile/settings"
  echo ""
  echo "Then run:"
  echo "  export ADMIN_TOKEN='your-token-here'"
  echo "  export ORG_ID='your-org-id-here'"
  echo "  ./scripts/test-security-fix.sh"
  echo ""
  exit 0
fi

# Initialize counters
PASSED=0
FAILED=0

##############################################
# ATTACK 1: User Import with super_admin role
##############################################
echo "============================================"
echo "🔴 ATTACK 1: User Import Privilege Escalation"
echo "============================================"
echo "Attempting to import user with super_admin role..."
echo ""

RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST \
  'https://feedbackflow-backend.onrender.com/api/v1/admin/users/import' \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"users\": [{
      \"email\": \"exploit-test-$(date +%s)@test.com\",
      \"name\": \"Exploit Test\",
      \"organizationId\": \"$ORG_ID\",
      \"roles\": [\"employee\", \"super_admin\"]
    }]
  }")

HTTP_CODE=$(echo "$RESPONSE" | grep "HTTP_CODE" | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_CODE/d')

echo "Response body:"
echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

if echo "$BODY" | grep -qi "Privilege escalation denied\|Admin access required\|Forbidden\|Unauthorized" || [ "$HTTP_CODE" == "401" ] || [ "$HTTP_CODE" == "403" ] || [ "$HTTP_CODE" == "400" ]; then
  echo -e "${GREEN}✅ ATTACK 1 BLOCKED: Access denied (HTTP $HTTP_CODE)${NC}"
  PASSED=$((PASSED + 1))
elif echo "$BODY" | grep -q '"success":false'; then
  echo -e "${GREEN}✅ ATTACK 1 BLOCKED: Request rejected${NC}"
  PASSED=$((PASSED + 1))
else
  echo -e "${RED}❌ ATTACK 1 SUCCEEDED: User imported with super_admin role!${NC}"
  echo -e "${RED}   CRITICAL VULNERABILITY EXISTS!${NC}"
  FAILED=$((FAILED + 1))
fi
echo ""

##############################################
# ATTACK 2: Bulk Role Assignment
##############################################
echo "============================================"
echo "🔴 ATTACK 2: Bulk Role Assignment"
echo "============================================"
echo "Getting super_admin role ID..."

SUPER_ADMIN_ROLE_ID=$(curl -s 'https://feedbackflow-backend.onrender.com/api/v1/admin/roles' \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data[] | select(.name=="super_admin") | .id')

if [ -z "$SUPER_ADMIN_ROLE_ID" ] || [ "$SUPER_ADMIN_ROLE_ID" == "null" ]; then
  echo -e "${YELLOW}⚠️  Could not get super_admin role ID, skipping attack 2${NC}"
else
  echo "Super admin role ID: $SUPER_ADMIN_ROLE_ID"
  echo ""

  echo "Getting a test user..."
  TEST_USER_ID=$(curl -s "https://feedbackflow-backend.onrender.com/api/v1/admin/users?limit=1&organizationId=$ORG_ID" \
    -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r '.data[0].id')

  if [ -z "$TEST_USER_ID" ] || [ "$TEST_USER_ID" == "null" ]; then
    echo -e "${YELLOW}⚠️  No test users found, skipping attack 2${NC}"
  else
    echo "Test user ID: $TEST_USER_ID"
    echo ""
    echo "Attempting bulk role assignment..."

    RESPONSE2=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST \
      'https://feedbackflow-backend.onrender.com/api/v1/admin/users/bulk' \
      -H "Authorization: Bearer $ADMIN_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{
        \"operation\": \"assign_role\",
        \"userIds\": [\"$TEST_USER_ID\"],
        \"roleId\": \"$SUPER_ADMIN_ROLE_ID\"
      }")

    HTTP_CODE2=$(echo "$RESPONSE2" | grep "HTTP_CODE" | cut -d: -f2)
    BODY2=$(echo "$RESPONSE2" | sed '/HTTP_CODE/d')

    echo "Response body:"
    echo "$BODY2" | jq '.' 2>/dev/null || echo "$BODY2"
    echo ""

    if echo "$BODY2" | grep -qi "Privilege escalation denied\|Admin access required\|Forbidden\|Unauthorized" || [ "$HTTP_CODE2" == "401" ] || [ "$HTTP_CODE2" == "403" ] || [ "$HTTP_CODE2" == "400" ]; then
      echo -e "${GREEN}✅ ATTACK 2 BLOCKED: Access denied (HTTP $HTTP_CODE2)${NC}"
      PASSED=$((PASSED + 1))
    elif echo "$BODY2" | grep -q '"success":false'; then
      echo -e "${GREEN}✅ ATTACK 2 BLOCKED: Request rejected${NC}"
      PASSED=$((PASSED + 1))
    else
      echo -e "${RED}❌ ATTACK 2 SUCCEEDED: Role assigned!${NC}"
      echo -e "${RED}   CRITICAL VULNERABILITY EXISTS!${NC}"
      FAILED=$((FAILED + 1))
    fi
  fi
fi
echo ""

##############################################
# ATTACK 3: Direct Role Assignment
##############################################
echo "============================================"
echo "🔴 ATTACK 3: Direct Role Assignment"
echo "============================================"

if [ -z "$SUPER_ADMIN_ROLE_ID" ] || [ "$SUPER_ADMIN_ROLE_ID" == "null" ] || [ -z "$TEST_USER_ID" ] || [ "$TEST_USER_ID" == "null" ]; then
  echo -e "${YELLOW}⚠️  Missing prerequisites, skipping attack 3${NC}"
else
  echo "Attempting direct role assignment..."
  
  RESPONSE3=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST \
    "https://feedbackflow-backend.onrender.com/api/v1/admin/users/$TEST_USER_ID/roles" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"roleId\": \"$SUPER_ADMIN_ROLE_ID\"
    }")

  HTTP_CODE3=$(echo "$RESPONSE3" | grep "HTTP_CODE" | cut -d: -f2)
  BODY3=$(echo "$RESPONSE3" | sed '/HTTP_CODE/d')

  echo "Response body:"
  echo "$BODY3" | jq '.' 2>/dev/null || echo "$BODY3"
  echo ""

  if echo "$BODY3" | grep -qi "Privilege escalation denied\|Admin access required\|Forbidden\|Unauthorized" || [ "$HTTP_CODE3" == "401" ] || [ "$HTTP_CODE3" == "403" ] || [ "$HTTP_CODE3" == "400" ]; then
    echo -e "${GREEN}✅ ATTACK 3 BLOCKED: Access denied (HTTP $HTTP_CODE3)${NC}"
    PASSED=$((PASSED + 1))
  elif echo "$BODY3" | grep -q '"success":false'; then
    echo -e "${GREEN}✅ ATTACK 3 BLOCKED: Request rejected${NC}"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}❌ ATTACK 3 SUCCEEDED: Role assigned directly!${NC}"
    echo -e "${RED}   CRITICAL VULNERABILITY EXISTS!${NC}"
    FAILED=$((FAILED + 1))
  fi
fi
echo ""

##############################################
# SUMMARY
##############################################
echo "============================================"
echo "📊 PENETRATION TEST SUMMARY"
echo "============================================"
echo "Total attacks attempted: $((PASSED + FAILED))"
echo -e "${GREEN}Attacks blocked: $PASSED${NC}"
echo -e "${RED}Attacks succeeded: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ ALL ATTACKS BLOCKED - SECURITY FIX IS WORKING!${NC}"
  echo ""
  echo "Recommendation: ✅ READY FOR PRODUCTION DEPLOYMENT"
  exit 0
else
  echo -e "${RED}❌ VULNERABILITY STILL EXISTS!${NC}"
  echo ""
  echo "DO NOT DEPLOY TO PRODUCTION!"
  echo "Contact security team immediately."
  exit 1
fi

