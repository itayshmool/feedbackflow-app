#!/bin/bash

# Test Complete Organization Setup Process
echo "🚀 Testing Complete Organization Setup Process"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test API endpoint
test_endpoint() {
    local method=$1
    local url=$2
    local data=$3
    local expected_status=$4
    local description=$5
    
    echo -e "\n${YELLOW}Testing: $description${NC}"
    echo "URL: $method $url"
    
    if [ -n "$data" ]; then
        response=$(curl -s -w "\n%{http_code}" -X $method \
            -H "Content-Type: application/json" \
            -d "$data" \
            "$url")
    else
        response=$(curl -s -w "\n%{http_code}" "$url")
    fi
    
    # Split response and status code
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✅ SUCCESS (HTTP $http_code)${NC}"
        echo "Response: $body" | jq '.' 2>/dev/null || echo "Response: $body"
        return 0
    else
        echo -e "${RED}❌ FAILED (Expected HTTP $expected_status, got HTTP $http_code)${NC}"
        echo "Response: $body"
        return 1
    fi
}

# Test 1: Health Check
echo -e "\n${YELLOW}=== STEP 1: Health Check ===${NC}"
test_endpoint "GET" "http://localhost:5000/health" "" "200" "Backend Health Check"

# Test 2: Create Organization
echo -e "\n${YELLOW}=== STEP 2: Create Organization ===${NC}"
org_data='{
    "name": "Complete Test Organization",
    "slug": "complete-test-org",
    "description": "Testing complete organization setup",
    "contactEmail": "admin@completetest.com",
    "subscriptionPlan": "professional",
    "maxUsers": 100
}'

if test_endpoint "POST" "http://localhost:5000/api/v1/admin/organizations" "$org_data" "201" "Create Organization"; then
    # Extract organization ID from response
    org_id=$(echo "$body" | jq -r '.data.id')
    echo "Organization ID: $org_id"
else
    echo -e "${RED}❌ Cannot proceed without organization${NC}"
    exit 1
fi

# Test 3: Create Users
echo -e "\n${YELLOW}=== STEP 3: Create Users ===${NC}"

# Create Manager
manager_data="{
    \"name\": \"John Manager\",
    \"email\": \"john.manager@completetest.com\",
    \"organizationId\": \"$org_id\",
    \"department\": \"Engineering\",
    \"position\": \"Engineering Manager\",
    \"roles\": [\"manager\"],
    \"isActive\": true,
    \"emailVerified\": true
}"

if test_endpoint "POST" "http://localhost:5000/api/v1/admin/users" "$manager_data" "201" "Create Manager User"; then
    manager_id=$(echo "$body" | jq -r '.data.id')
    echo "Manager ID: $manager_id"
fi

# Create Employee
employee_data="{
    \"name\": \"Jane Employee\",
    \"email\": \"jane.employee@completetest.com\",
    \"organizationId\": \"$org_id\",
    \"department\": \"Engineering\",
    \"position\": \"Software Engineer\",
    \"roles\": [\"employee\"],
    \"isActive\": true,
    \"emailVerified\": true
}"

if test_endpoint "POST" "http://localhost:5000/api/v1/admin/users" "$employee_data" "201" "Create Employee User"; then
    employee_id=$(echo "$body" | jq -r '.data.id')
    echo "Employee ID: $employee_id"
fi

# Test 4: Create Department
echo -e "\n${YELLOW}=== STEP 4: Create Department ===${NC}"
dept_data="{
    \"name\": \"Engineering\",
    \"description\": \"Software development department\",
    \"type\": \"engineering\",
    \"managerEmail\": \"john.manager@completetest.com\"
}"

if test_endpoint "POST" "http://localhost:5000/api/v1/admin/organizations/$org_id/departments" "$dept_data" "201" "Create Department"; then
    dept_id=$(echo "$body" | jq -r '.data.id')
    echo "Department ID: $dept_id"
fi

# Test 5: Create Team
echo -e "\n${YELLOW}=== STEP 5: Create Team ===${NC}"
team_data="{
    \"name\": \"Frontend Team\",
    \"description\": \"Frontend development team\",
    \"type\": \"core\",
    \"departmentId\": \"$dept_id\",
    \"teamLeadEmail\": \"john.manager@completetest.com\"
}"

if test_endpoint "POST" "http://localhost:5000/api/v1/admin/organizations/$org_id/teams" "$team_data" "201" "Create Team"; then
    team_id=$(echo "$body" | jq -r '.data.id')
    echo "Team ID: $team_id"
fi

# Test 6: Create Hierarchy Relationship
echo -e "\n${YELLOW}=== STEP 6: Create Hierarchy Relationship ===${NC}"
hierarchy_data="{
    \"organizationId\": \"$org_id\",
    \"managerId\": \"$manager_id\",
    \"employeeId\": \"$employee_id\",
    \"level\": 1,
    \"isDirectReport\": true
}"

test_endpoint "POST" "http://localhost:5000/api/v1/hierarchy" "$hierarchy_data" "200" "Create Hierarchy Relationship"

# Test 7: Create Feedback Cycle
echo -e "\n${YELLOW}=== STEP 7: Create Feedback Cycle ===${NC}"
cycle_data="{
    \"name\": \"Q1 2024 Performance Review\",
    \"organizationId\": \"$org_id\",
    \"startDate\": \"2024-01-01\",
    \"endDate\": \"2024-03-31\",
    \"description\": \"Quarterly performance review cycle\"
}"

test_endpoint "POST" "http://localhost:5000/api/v1/cycles" "$cycle_data" "201" "Create Feedback Cycle"

# Test 8: Verify Setup
echo -e "\n${YELLOW}=== STEP 8: Verify Complete Setup ===${NC}"

# Verify Organization
test_endpoint "GET" "http://localhost:5000/api/v1/admin/organizations/$org_id" "" "200" "Get Organization Details"

# Verify Users
test_endpoint "GET" "http://localhost:5000/api/v1/admin/users?organizationId=$org_id" "" "200" "Get Organization Users"

# Verify Departments
test_endpoint "GET" "http://localhost:5000/api/v1/admin/organizations/$org_id/departments" "" "200" "Get Organization Departments"

# Verify Teams
test_endpoint "GET" "http://localhost:5000/api/v1/admin/organizations/$org_id/teams" "" "200" "Get Organization Teams"

# Summary
echo -e "\n${GREEN}=== SETUP COMPLETE ===${NC}"
echo -e "${GREEN}✅ Organization: $org_id${NC}"
echo -e "${GREEN}✅ Manager: $manager_id${NC}"
echo -e "${GREEN}✅ Employee: $employee_id${NC}"
echo -e "${GREEN}✅ Department: $dept_id${NC}"
echo -e "${GREEN}✅ Team: $team_id${NC}"
echo -e "\n${YELLOW}You can now test the UI at: http://localhost:3004${NC}"
echo -e "${YELLOW}Login with: john.manager@completetest.com (Manager) or jane.employee@completetest.com (Employee)${NC}"
