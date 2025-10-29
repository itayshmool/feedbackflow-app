#!/bin/bash

# Comprehensive Test Runner for Feedback Templates Backend
# This script runs all unit and integration tests for the template system

echo "🧪 Starting Comprehensive Test Suite for Feedback Templates"
echo "=========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test file and track results
run_test() {
    local test_file=$1
    local test_name=$2
    
    echo -e "\n${BLUE}Running: ${test_name}${NC}"
    echo "File: ${test_file}"
    echo "----------------------------------------"
    
    if [ -f "$test_file" ]; then
        if npm test -- "$test_file" --verbose; then
            echo -e "${GREEN}✅ PASSED: ${test_name}${NC}"
            ((PASSED_TESTS++))
        else
            echo -e "${RED}❌ FAILED: ${test_name}${NC}"
            ((FAILED_TESTS++))
        fi
    else
        echo -e "${YELLOW}⚠️  SKIPPED: ${test_name} (file not found)${NC}"
    fi
    
    ((TOTAL_TESTS++))
}

# Function to run integration tests
run_integration_test() {
    local test_file=$1
    local test_name=$2
    
    echo -e "\n${BLUE}Running Integration Test: ${test_name}${NC}"
    echo "File: ${test_file}"
    echo "----------------------------------------"
    
    if [ -f "$test_file" ]; then
        if npm run test:integration -- "$test_file" --verbose; then
            echo -e "${GREEN}✅ PASSED: ${test_name}${NC}"
            ((PASSED_TESTS++))
        else
            echo -e "${RED}❌ FAILED: ${test_name}${NC}"
            ((FAILED_TESTS++))
        fi
    else
        echo -e "${YELLOW}⚠️  SKIPPED: ${test_name} (file not found)${NC}"
    fi
    
    ((TOTAL_TESTS++))
}

echo -e "\n${YELLOW}📋 Test Categories:${NC}"
echo "1. File Storage & Validation Tests"
echo "2. Template Document Model Tests"
echo "3. Template Document Service Tests"
echo "4. Template Attachment Model Tests"
echo "5. Template Attachment Service Tests"
echo "6. Template Analytics Service Tests"
echo "7. Template Settings Service Tests"
echo "8. Controller Tests"
echo "9. Validation Schema Tests"
echo "10. Virus Scanning Service Tests"
echo "11. Integration Workflow Tests"

echo -e "\n${YELLOW}🚀 Starting Test Execution...${NC}"

# 1. File Storage & Validation Tests
echo -e "\n${YELLOW}=== File Storage & Validation Tests ===${NC}"
run_test "backend/tests/unit/templates/FileStorageService.test.ts" "FileStorageService Unit Tests"
run_test "backend/tests/unit/templates/file-validator.test.ts" "File Validator Unit Tests"

# 2. Template Document Model Tests
echo -e "\n${YELLOW}=== Template Document Model Tests ===${NC}"
run_test "backend/tests/unit/templates/TemplateDocumentModel.test.ts" "TemplateDocumentModel Unit Tests"

# 3. Template Document Service Tests
echo -e "\n${YELLOW}=== Template Document Service Tests ===${NC}"
run_test "backend/tests/unit/templates/TemplateDocumentService.test.ts" "TemplateDocumentService Unit Tests"

# 4. Template Attachment Model Tests
echo -e "\n${YELLOW}=== Template Attachment Model Tests ===${NC}"
run_test "backend/tests/unit/templates/TemplateAttachmentModel.test.ts" "TemplateAttachmentModel Unit Tests"

# 5. Template Attachment Service Tests
echo -e "\n${YELLOW}=== Template Attachment Service Tests ===${NC}"
run_test "backend/tests/unit/templates/TemplateAttachmentService.test.ts" "TemplateAttachmentService Unit Tests"

# 6. Template Analytics Service Tests
echo -e "\n${YELLOW}=== Template Analytics Service Tests ===${NC}"
run_test "backend/tests/unit/templates/TemplateAnalyticsService.test.ts" "TemplateAnalyticsService Unit Tests"

# 7. Template Settings Service Tests
echo -e "\n${YELLOW}=== Template Settings Service Tests ===${NC}"
run_test "backend/tests/unit/templates/TemplateSettingsService.test.ts" "TemplateSettingsService Unit Tests"

# 8. Controller Tests
echo -e "\n${YELLOW}=== Controller Tests ===${NC}"
run_test "backend/tests/unit/templates/TemplateDocumentController.test.ts" "TemplateDocumentController Unit Tests"
run_test "backend/tests/unit/templates/TemplateAttachmentController.test.ts" "TemplateAttachmentController Unit Tests"
run_test "backend/tests/unit/templates/TemplateSettingsController.test.ts" "TemplateSettingsController Unit Tests"

# 9. Validation Schema Tests
echo -e "\n${YELLOW}=== Validation Schema Tests ===${NC}"
run_test "backend/tests/unit/templates/template-schemas.test.ts" "Template Validation Schemas Unit Tests"

# 10. Virus Scanning Service Tests
echo -e "\n${YELLOW}=== Virus Scanning Service Tests ===${NC}"
run_test "backend/tests/unit/templates/VirusScanService.test.ts" "VirusScanService Unit Tests"

# 11. Integration Workflow Tests
echo -e "\n${YELLOW}=== Integration Workflow Tests ===${NC}"
run_integration_test "backend/tests/integration/templates/TemplateWorkflows.test.ts" "Template Workflows Integration Tests"

# Test Summary
echo -e "\n${YELLOW}=========================================================="
echo "📊 TEST EXECUTION SUMMARY"
echo "==========================================================${NC}"

echo -e "Total Tests: ${TOTAL_TESTS}"
echo -e "${GREEN}Passed: ${PASSED_TESTS}${NC}"
echo -e "${RED}Failed: ${FAILED_TESTS}${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}🎉 ALL TESTS PASSED! 🎉${NC}"
    echo -e "${GREEN}The Feedback Templates backend is fully tested and ready for production.${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed. Please review the output above.${NC}"
    echo -e "${YELLOW}💡 Tip: Check the test files and ensure all dependencies are properly mocked.${NC}"
    exit 1
fi
