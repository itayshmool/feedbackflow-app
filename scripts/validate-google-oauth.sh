#!/bin/bash

# Google OAuth Configuration Validator
# Validates environment variables, server status, and endpoint accessibility

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Track validation results
CHECKS_PASSED=0
CHECKS_FAILED=0
WARNINGS=0
VERBOSE=false

# Get the project root directory (parent of scripts/)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓${NC} $1"
    ((CHECKS_PASSED++))
}

print_error() {
    echo -e "${RED}✗${NC} $1"
    ((CHECKS_FAILED++))
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_header() {
    echo -e "${BOLD}========================================"
    echo "Google OAuth Configuration Validator"
    echo -e "========================================${NC}"
    echo ""
}

print_section() {
    echo ""
    echo -e "${BOLD}[$1] $2${NC}"
}

# Mask sensitive values (show first 15 and last 30 chars)
mask_value() {
    local value="$1"
    if [ ${#value} -gt 50 ]; then
        echo "${value:0:15}...${value: -30}"
    else
        echo "$value"
    fi
}

# Check if file exists
check_file_exists() {
    local file="$1"
    local display_name="$2"
    
    if [ -f "$file" ]; then
        print_success "$display_name exists"
        return 0
    else
        print_error "$display_name NOT FOUND"
        return 1
    fi
}

# Extract environment variable from .env file
get_env_variable() {
    local file="$1"
    local var_name="$2"
    
    if [ ! -f "$file" ]; then
        echo ""
        return 1
    fi
    
    # Extract value (handle with or without quotes, comments, etc.)
    local value=$(grep "^${var_name}=" "$file" | head -1 | cut -d '=' -f 2- | sed 's/^["'"'"']//;s/["'"'"']$//' | sed 's/#.*//' | xargs)
    echo "$value"
}

# Check if environment variable is set
check_env_variable() {
    local file="$1"
    local var_name="$2"
    local display_name="$3"
    
    local value=$(get_env_variable "$file" "$var_name")
    
    if [ -z "$value" ]; then
        print_error "$var_name is NOT SET in $display_name"
        return 1
    else
        print_success "$var_name is set"
        if [ "$VERBOSE" = true ]; then
            print_info "  Value: $(mask_value "$value")"
        fi
        return 0
    fi
}

# Check if server is running on a port
check_server_running() {
    local port="$1"
    local server_name="$2"
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_success "$server_name is running (port $port)"
        return 0
    else
        print_error "$server_name is NOT running (port $port)"
        return 1
    fi
}

# Test backend endpoint
test_backend_endpoint() {
    print_info "Testing /api/v1/auth/login/google endpoint..."
    
    # Make curl request with invalid token
    local response=$(curl -s -X POST http://localhost:5000/api/v1/auth/login/google \
        -H "Content-Type: application/json" \
        -d '{"idToken": "test-invalid-token"}' \
        -w "\n%{http_code}" 2>/dev/null)
    
    local http_code=$(echo "$response" | tail -1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$VERBOSE" = true ]; then
        print_info "  HTTP Status: $http_code"
        print_info "  Response: $body"
    fi
    
    # Check if endpoint exists (not 404)
    if [ "$http_code" = "404" ]; then
        print_error "Endpoint /api/v1/auth/login/google NOT FOUND (404)"
        return 1
    elif [ "$http_code" = "000" ]; then
        print_error "Cannot connect to backend server"
        return 1
    else
        print_success "Endpoint /api/v1/auth/login/google exists"
    fi
    
    # Check if Google OAuth is configured
    if echo "$body" | grep -q "Google OAuth not configured"; then
        print_error "Backend error: Google OAuth not configured"
        print_info "  → GOOGLE_CLIENT_ID is not set in backend environment"
        return 1
    elif echo "$body" | grep -q "Invalid Google token"; then
        print_success "Google OAuth is properly configured in backend"
        return 0
    elif [ "$http_code" = "401" ] || [ "$http_code" = "400" ]; then
        print_success "Google OAuth is properly configured in backend"
        return 0
    else
        print_warning "Unexpected response from endpoint"
        if [ "$VERBOSE" = true ]; then
            print_info "  Response: $body"
        fi
        return 0
    fi
}

# Test frontend accessibility
test_frontend() {
    print_info "Testing frontend accessibility..."
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3006 2>/dev/null)
    
    if [ "$response" = "200" ]; then
        print_success "Frontend is accessible at http://localhost:3006"
        return 0
    else
        print_error "Frontend is not accessible (HTTP $response)"
        return 1
    fi
}

# Print summary and recommendations
print_summary() {
    echo ""
    echo -e "${BOLD}========================================"
    echo "VALIDATION SUMMARY"
    echo -e "========================================${NC}"
    echo -e "${GREEN}✓ Passed:${NC}   $CHECKS_PASSED"
    echo -e "${RED}✗ Failed:${NC}   $CHECKS_FAILED"
    echo -e "${YELLOW}⚠ Warnings:${NC} $WARNINGS"
    echo ""
    
    if [ $CHECKS_FAILED -eq 0 ]; then
        echo -e "${GREEN}${BOLD}Status: ALL CHECKS PASSED ✓${NC}"
        echo ""
        return 0
    else
        echo -e "${RED}${BOLD}Status: VALIDATION FAILED ✗${NC}"
        echo ""
        echo -e "${BOLD}Recommendations:${NC}"
        
        # Check specific failure scenarios and provide guidance
        local backend_env="$PROJECT_ROOT/backend/.env"
        local frontend_env="$PROJECT_ROOT/frontend/.env"
        
        if [ ! -f "$backend_env" ]; then
            echo -e "${YELLOW}1.${NC} Create backend/.env file:"
            echo "   cp backend/.env.example backend/.env"
            echo "   # Or create manually with required variables"
        fi
        
        if [ ! -f "$frontend_env" ]; then
            echo -e "${YELLOW}2.${NC} Create frontend/.env file:"
            echo "   cp frontend/.env.example frontend/.env"
            echo "   # Or create manually with required variables"
        fi
        
        local backend_client_id=$(get_env_variable "$backend_env" "GOOGLE_CLIENT_ID")
        if [ -z "$backend_client_id" ]; then
            echo -e "${YELLOW}3.${NC} Add GOOGLE_CLIENT_ID to backend/.env:"
            echo "   GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com"
        fi
        
        local frontend_client_id=$(get_env_variable "$frontend_env" "VITE_GOOGLE_CLIENT_ID")
        if [ -z "$frontend_client_id" ]; then
            echo -e "${YELLOW}4.${NC} Add VITE_GOOGLE_CLIENT_ID to frontend/.env:"
            echo "   VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com"
        fi
        
        echo -e "${YELLOW}5.${NC} After updating .env files, restart both servers:"
        echo "   # Stop servers"
        echo "   lsof -ti:5000 | xargs kill -9"
        echo "   lsof -ti:3006 | xargs kill -9"
        echo "   "
        echo "   # Start backend"
        echo "   cd backend && node dist/real-database-server.js &"
        echo "   "
        echo "   # Start frontend"
        echo "   cd frontend && npm run dev &"
        
        echo ""
        return 1
    fi
}

# Print help
print_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Validates Google OAuth configuration for FeedbackFlow"
    echo ""
    echo "Options:"
    echo "  -v, --verbose    Enable verbose output"
    echo "  -h, --help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0               Run validation"
    echo "  $0 -v            Run with verbose output"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            print_help
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            print_help
            exit 1
            ;;
    esac
done

# Main validation flow
main() {
    print_header
    
    # [1/8] Check environment files
    print_section "1/8" "Checking environment files..."
    check_file_exists "$PROJECT_ROOT/backend/.env" "backend/.env"
    check_file_exists "$PROJECT_ROOT/frontend/.env" "frontend/.env"
    
    # [2/8] Validate backend configuration
    print_section "2/8" "Validating backend configuration..."
    check_env_variable "$PROJECT_ROOT/backend/.env" "GOOGLE_CLIENT_ID" "backend/.env"
    BACKEND_CLIENT_ID=$(get_env_variable "$PROJECT_ROOT/backend/.env" "GOOGLE_CLIENT_ID")
    
    # [3/8] Validate frontend configuration
    print_section "3/8" "Validating frontend configuration..."
    check_env_variable "$PROJECT_ROOT/frontend/.env" "VITE_GOOGLE_CLIENT_ID" "frontend/.env"
    FRONTEND_CLIENT_ID=$(get_env_variable "$PROJECT_ROOT/frontend/.env" "VITE_GOOGLE_CLIENT_ID")
    
    # [4/8] Check value consistency
    print_section "4/8" "Checking value consistency..."
    if [ -n "$BACKEND_CLIENT_ID" ] && [ -n "$FRONTEND_CLIENT_ID" ]; then
        if [ "$BACKEND_CLIENT_ID" = "$FRONTEND_CLIENT_ID" ]; then
            print_success "Client IDs match between backend and frontend"
        else
            print_error "Client ID MISMATCH"
            if [ "$VERBOSE" = true ]; then
                print_info "  Backend:  $(mask_value "$BACKEND_CLIENT_ID")"
                print_info "  Frontend: $(mask_value "$FRONTEND_CLIENT_ID")"
            fi
        fi
    else
        print_warning "Cannot compare Client IDs (one or both are missing)"
    fi
    
    # [5/8] Check server status
    print_section "5/8" "Checking server status..."
    check_server_running 5000 "Backend server"
    check_server_running 3006 "Frontend server"
    
    # [6/8] Test backend endpoint (only if backend is running)
    print_section "6/8" "Testing backend endpoint..."
    if lsof -Pi :5000 -sTCP:LISTEN -t >/dev/null 2>&1; then
        test_backend_endpoint
    else
        print_warning "Skipping endpoint test (backend not running)"
    fi
    
    # [7/8] Test frontend accessibility (only if frontend is running)
    print_section "7/8" "Testing frontend accessibility..."
    if lsof -Pi :3006 -sTCP:LISTEN -t >/dev/null 2>&1; then
        test_frontend
    else
        print_warning "Skipping frontend test (frontend not running)"
    fi
    
    # Print summary
    print_summary
    
    # Return appropriate exit code
    if [ $CHECKS_FAILED -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Run main function
main

