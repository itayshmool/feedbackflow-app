#!/bin/bash

# E2E Test Runner for FeedbackFlow
# This script helps you run comprehensive end-to-end tests

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if services are running
check_services() {
    print_status "Checking if required services are running..."
    
    # Check if frontend is running
    if curl -s http://localhost:3003 > /dev/null; then
        print_success "Frontend is running on port 3003"
    else
        print_error "Frontend is not running on port 3003"
        print_status "Please start the frontend with: npm run dev"
        exit 1
    fi
    
    # Check if backend is running
    if curl -s http://localhost:5000/api/v1/health > /dev/null; then
        print_success "Backend is running on port 5000"
    else
        print_error "Backend is not running on port 5000"
        print_status "Please start the backend with: node dist/simple-server.js"
        exit 1
    fi
}

# Function to run specific test suite
run_test_suite() {
    local suite=$1
    local description=$2
    
    print_status "Running $description..."
    
    if npm run test:e2e -- --grep "$suite"; then
        print_success "$description completed successfully"
    else
        print_error "$description failed"
        return 1
    fi
}

# Function to run all tests
run_all_tests() {
    print_status "Running all E2E tests..."
    
    if npm run test:e2e; then
        print_success "All E2E tests completed successfully"
    else
        print_error "Some E2E tests failed"
        return 1
    fi
}

# Function to run tests in headed mode (visible browser)
run_headed_tests() {
    print_status "Running E2E tests in headed mode (visible browser)..."
    
    if npm run test:e2e:headed; then
        print_success "Headed E2E tests completed successfully"
    else
        print_error "Headed E2E tests failed"
        return 1
    fi
}

# Function to run tests in fast mode (no video, minimal reporting)
run_fast_tests() {
    local suite=$1
    local description=$2
    
    print_status "Running $description in fast mode (no video, minimal reporting)..."
    
    if [ -n "$suite" ]; then
        npx playwright test --grep "$suite" --reporter=list
    else
        npx playwright test --reporter=list
    fi
}

# Function to run tests in debug mode
run_debug_tests() {
    print_status "Running E2E tests in debug mode..."
    print_warning "Debug mode will open browser and pause on failures"
    
    npm run test:e2e:debug
}

# Function to show test report
show_report() {
    print_status "Opening test report..."
    npm run test:e2e:report
}

# Function to run tests with UI
run_ui_tests() {
    print_status "Running E2E tests with UI..."
    npm run test:e2e:ui
}

# Function to run specific test file
run_test_file() {
    local file=$1
    
    if [ -z "$file" ]; then
        print_error "Please specify a test file"
        print_status "Available test files:"
        ls -1 e2e/*.spec.ts | sed 's/^/  - /'
        return 1
    fi
    
    if [ ! -f "e2e/$file" ]; then
        print_error "Test file e2e/$file not found"
        return 1
    fi
    
    print_status "Running test file: $file"
    
    if npm run test:e2e -- e2e/$file; then
        print_success "Test file $file completed successfully"
    else
        print_error "Test file $file failed"
        return 1
    fi
}

# Function to show help
show_help() {
    echo "FeedbackFlow E2E Test Runner"
    echo ""
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  all                 Run all E2E tests"
    echo "  auth                Run authentication tests"
    echo "  organization        Run organization management tests"
    echo "  dashboard           Run admin dashboard tests"
    echo "  api                 Run API integration tests"
    echo "  fast                Run all tests in fast mode (no video, minimal reporting)"
    echo "  fast-auth           Run auth tests in fast mode"
    echo "  fast-dashboard      Run dashboard tests in fast mode"
    echo "  fast-organization   Run organization tests in fast mode"
    echo "  headed              Run tests in headed mode (visible browser)"
    echo "  debug               Run tests in debug mode"
    echo "  ui                  Run tests with Playwright UI"
    echo "  report              Show test report"
    echo "  file <filename>     Run specific test file"
    echo "  check               Check if services are running"
    echo "  help                Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 all              # Run all tests"
    echo "  $0 fast             # Run all tests in fast mode"
    echo "  $0 fast-dashboard   # Run dashboard tests in fast mode"
    echo "  $0 auth             # Run only authentication tests"
    echo "  $0 headed           # Run tests with visible browser"
    echo "  $0 file auth.spec.ts # Run specific test file"
    echo "  $0 debug            # Run tests in debug mode"
}

# Main script logic
case "${1:-help}" in
    "all")
        check_services
        run_all_tests
        ;;
    "auth")
        check_services
        run_test_suite "Authentication Flow" "Authentication E2E tests"
        ;;
    "organization")
        check_services
        run_test_suite "Organization Management" "Organization Management E2E tests"
        ;;
    "dashboard")
        check_services
        run_test_suite "Admin Dashboard" "Admin Dashboard E2E tests"
        ;;
    "api")
        check_services
        run_test_suite "API Integration Tests" "API Integration E2E tests"
        ;;
    "fast")
        check_services
        run_fast_tests "" "All E2E tests"
        ;;
    "fast-auth")
        check_services
        run_fast_tests "Authentication Flow" "Authentication E2E tests"
        ;;
    "fast-dashboard")
        check_services
        run_fast_tests "Admin Dashboard" "Admin Dashboard E2E tests"
        ;;
    "fast-organization")
        check_services
        run_fast_tests "Organization Management" "Organization Management E2E tests"
        ;;
    "headed")
        check_services
        run_headed_tests
        ;;
    "debug")
        check_services
        run_debug_tests
        ;;
    "ui")
        check_services
        run_ui_tests
        ;;
    "report")
        show_report
        ;;
    "file")
        check_services
        run_test_file "$2"
        ;;
    "check")
        check_services
        ;;
    "help"|*)
        show_help
        ;;
esac
