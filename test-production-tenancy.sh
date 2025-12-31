#!/bin/bash
# Production Tenancy Vulnerability Test
# Run this after manually deploying to production in Render dashboard

set -e

PRODUCTION_URL="https://feedbackflow-backend-production.onrender.com"
ADMIN_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI0ZTRhY2E0NS05NWNmLTQwOTYtODg2MC1jNjBlMGRiZDM0MzgiLCJlbWFpbCI6ImlzcmFlbHpAd2l4LmNvbSIsIm5hbWUiOiJJc3JhZWwgWmFibGlhbm92Iiwicm9sZXMiOlsiYWRtaW4iLCJlbXBsb3llZSIsIm1hbmFnZXIiXSwiaWF0IjoxNzY2NTg5MjU1LCJleHAiOjE3NjY2MTA4NTV9.L0cjasF6Pzbr2ihpbBQw-AIbne6OPkGJ-EimWFROZE8"

echo "═══════════════════════════════════════════════════════════════"
echo "  Production Deployment Verification"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Step 1: Check health
echo "Step 1: Checking production health..."
HEALTH=$(curl -s "$PRODUCTION_URL/api/v1/health")
echo "$HEALTH" | jq

if echo "$HEALTH" | jq -e '.status == "healthy"' > /dev/null; then
    echo "✅ Production is healthy"
else
    echo "❌ Production health check failed"
    exit 1
fi

echo ""
echo "Step 2: Getting organization list..."
ORGS=$(curl -s "$PRODUCTION_URL/api/v1/admin/organizations?limit=5" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json")

echo "$ORGS" | jq '.data[] | {id, name, slug}' | head -20

# Extract org IDs
ORG_A_ID=$(echo "$ORGS" | jq -r '.data[0].id // empty')
ORG_A_NAME=$(echo "$ORGS" | jq -r '.data[0].name // empty')

echo ""
echo "Your organization: $ORG_A_NAME ($ORG_A_ID)"

# Check if there's a second org for testing
ORG_COUNT=$(echo "$ORGS" | jq '.data | length')

if [ "$ORG_COUNT" -lt 2 ]; then
    echo ""
    echo "⚠️  Only 1 organization found."
    echo "Creating a test organization for vulnerability testing..."
    
    CREATE_RESULT=$(curl -s -X POST "$PRODUCTION_URL/api/v1/admin/organizations" \
        -H "Authorization: Bearer $ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{
            "name": "Test Target Organization",
            "slug": "test-target-org",
            "description": "Test organization for security verification",
            "contactEmail": "test@targetorg.com",
            "subscriptionPlan": "professional",
            "maxUsers": 100,
            "isActive": true
        }')
    
    ORG_B_ID=$(echo "$CREATE_RESULT" | jq -r '.data.id // .id // empty')
    ORG_B_NAME=$(echo "$CREATE_RESULT" | jq -r '.data.name // .name // empty')
    ORG_B_SLUG=$(echo "$CREATE_RESULT" | jq -r '.data.slug // .slug // empty')
    
    echo "✅ Created test organization: $ORG_B_NAME ($ORG_B_ID)"
else
    ORG_B_ID=$(echo "$ORGS" | jq -r '.data[1].id')
    ORG_B_NAME=$(echo "$ORGS" | jq -r '.data[1].name')
    ORG_B_SLUG=$(echo "$ORGS" | jq -r '.data[1].slug')
    
    echo "Using existing organization: $ORG_B_NAME ($ORG_B_ID)"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Running Vulnerability Tests on Production"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Set environment variable for production URL
export STAGING_URL="$PRODUCTION_URL"

# Run the test script
node test-tenancy-vulnerability.js \
    --admin-a-token "$ADMIN_TOKEN" \
    --admin-b-org-id "$ORG_B_ID" \
    --admin-b-org-name "$ORG_B_NAME" \
    --admin-b-org-slug "$ORG_B_SLUG"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "  Production Verification Complete"
echo "═══════════════════════════════════════════════════════════════"
