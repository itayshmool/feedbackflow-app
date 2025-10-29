#!/bin/bash

# Test runner for Feedback Workflow and Manager Analytics E2E tests

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Feedback & Analytics E2E Test Runner${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to check services
check_services() {
    echo -e "${BLUE}Checking if services are running...${NC}"
    
    # Check frontend
        if curl -s http://localhost:3008 > /dev/null; then
            echo -e "${GREEN}✓ Frontend is running (http://localhost:3008)${NC}"
        else
            echo -e "${RED}✗ Frontend is not running${NC}"
            echo -e "${YELLOW}  Please start: cd frontend && npm run dev${NC}"
            exit 1
        fi
    
    # Check backend
    if curl -s http://localhost:5000/api/v1/health > /dev/null; then
        echo -e "${GREEN}✓ Backend is running (http://localhost:5000)${NC}"
    else
        echo -e "${RED}✗ Backend is not running${NC}"
        echo -e "${YELLOW}  Please start: cd backend && tsx src/real-database-server.ts${NC}"
        exit 1
    fi
    
    echo ""
}

# Function to show usage
show_usage() {
    echo "Usage: ./run-feedback-tests.sh [option]"
    echo ""
    echo "Options:"
    echo "  all         - Run all feedback & analytics tests"
    echo "  feedback    - Run feedback workflow tests only"
    echo "  analytics   - Run manager analytics tests only"
    echo "  headed      - Run tests in headed mode (visible browser)"
    echo "  debug       - Run tests in debug mode"
    echo "  ui          - Run tests with Playwright UI"
    echo "  check       - Check if services are running"
    echo "  help        - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./run-feedback-tests.sh all"
    echo "  ./run-feedback-tests.sh feedback"
    echo "  ./run-feedback-tests.sh headed"
}

# Parse command
case "$1" in
    all)
        check_services
        echo -e "${BLUE}Running all feedback & analytics tests...${NC}"
        npm run test:e2e -- feedback-workflow.spec.ts manager-analytics.spec.ts
        ;;
    
    feedback)
        check_services
        echo -e "${BLUE}Running feedback workflow tests...${NC}"
        npm run test:e2e -- feedback-workflow.spec.ts
        ;;
    
    analytics)
        check_services
        echo -e "${BLUE}Running manager analytics tests...${NC}"
        npm run test:e2e -- manager-analytics.spec.ts
        ;;
    
    headed)
        check_services
        echo -e "${BLUE}Running tests in headed mode (visible browser)...${NC}"
        npm run test:e2e:headed -- feedback-workflow.spec.ts manager-analytics.spec.ts
        ;;
    
    debug)
        check_services
        echo -e "${BLUE}Running tests in debug mode...${NC}"
        npm run test:e2e:debug -- feedback-workflow.spec.ts
        ;;
    
    ui)
        check_services
        echo -e "${BLUE}Running tests with Playwright UI...${NC}"
        npm run test:e2e:ui -- feedback-workflow.spec.ts manager-analytics.spec.ts
        ;;
    
    check)
        check_services
        echo -e "${GREEN}All services are running!${NC}"
        ;;
    
    help|--help|-h)
        show_usage
        ;;
    
    "")
        echo -e "${YELLOW}No option provided${NC}"
        echo ""
        show_usage
        exit 1
        ;;
    
    *)
        echo -e "${RED}Unknown option: $1${NC}"
        echo ""
        show_usage
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Test execution complete!${NC}"
echo -e "${GREEN}========================================${NC}"

