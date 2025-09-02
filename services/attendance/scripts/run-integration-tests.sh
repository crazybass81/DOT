#!/bin/bash

#########################################################
# Integration Test Runner Script
# DOT Attendance System
#
# This script provides an easy way to run integration tests
# with proper environment setup and reporting.
#########################################################

set -euo pipefail

# Color codes
readonly GREEN='\033[0;32m'
readonly RED='\033[0;31m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m'

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly REPORTS_DIR="${PROJECT_ROOT}/tests/reports"

# Default values
TEST_SUITE="${TEST_SUITE:-all}"
VERBOSE="${VERBOSE:-false}"
COVERAGE="${COVERAGE:-false}"
BAIL_ON_FAILURE="${BAIL_ON_FAILURE:-false}"

# Logging functions
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $*${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING: $*${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ERROR: $*${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] INFO: $*${NC}"
}

# Show usage
show_usage() {
    cat << EOF
Usage: $0 [OPTIONS] [TEST_SUITE]

Integration Test Runner for DOT Attendance System

TEST_SUITES:
    all              Run all integration tests (default)
    rls              Run RLS policies tests only
    master-admin     Run master admin tests only
    workflow         Run full workflow tests only
    security         Run security-focused tests only
    performance      Run performance benchmarks only

OPTIONS:
    -v, --verbose           Enable verbose output
    -c, --coverage         Generate coverage report
    -b, --bail             Stop on first test failure
    -r, --report-only      Generate reports from existing results
    -h, --help             Show this help message

ENVIRONMENT VARIABLES:
    SUPABASE_SERVICE_ROLE_KEY   Required for database access
    TEST_SUPABASE_URL          Optional test database URL
    JEST_TIMEOUT               Test timeout in milliseconds

EXAMPLES:
    # Run all integration tests
    $0

    # Run RLS tests with verbose output
    $0 -v rls

    # Run security tests with coverage
    $0 -c security

    # Run workflow tests and stop on failure
    $0 -b workflow

EOF
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -v|--verbose)
                VERBOSE="true"
                shift
                ;;
            -c|--coverage)
                COVERAGE="true"
                shift
                ;;
            -b|--bail)
                BAIL_ON_FAILURE="true"
                shift
                ;;
            -r|--report-only)
                generate_reports_only
                exit 0
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            all|rls|master-admin|workflow|security|performance)
                TEST_SUITE="$1"
                shift
                ;;
            *)
                error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
}

# Validate environment
validate_environment() {
    log "Validating test environment"
    
    # Check Node.js
    if ! command -v node >/dev/null 2>&1; then
        error "Node.js is required but not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm >/dev/null 2>&1; then
        error "npm is required but not installed"
        exit 1
    fi
    
    # Check for required environment variables
    if [[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]]; then
        warn "SUPABASE_SERVICE_ROLE_KEY not set - some tests may fail"
        warn "Set it with: export SUPABASE_SERVICE_ROLE_KEY=your_key"
    fi
    
    # Create reports directory
    mkdir -p "$REPORTS_DIR"
    
    # Check if we're in the right directory
    if [[ ! -f "${PROJECT_ROOT}/web/package.json" ]]; then
        error "Must be run from the attendance service directory"
        exit 1
    fi
    
    log "Environment validation completed"
}

# Install dependencies if needed
ensure_dependencies() {
    log "Checking dependencies"
    
    cd "${PROJECT_ROOT}/web"
    
    if [[ ! -d "node_modules" ]] || [[ package.json -nt node_modules ]]; then
        log "Installing dependencies..."
        npm ci --silent
    else
        info "Dependencies are up to date"
    fi
    
    cd - >/dev/null
}

# Run specific test suite
run_test_suite() {
    local suite=$1
    local start_time=$(date +%s)
    
    log "Running $suite integration tests"
    
    cd "${PROJECT_ROOT}/web"
    
    # Build Jest command
    local jest_cmd="npm run"
    local jest_args=""
    
    case $suite in
        all)
            jest_cmd+=" test:integration"
            ;;
        rls)
            jest_cmd+=" test:rls"
            ;;
        master-admin)
            jest_cmd+=" test:master-admin"
            ;;
        workflow)
            jest_cmd+=" test:workflow"
            ;;
        security)
            jest_cmd+=" test:security"
            ;;
        performance)
            jest_cmd+=" test:performance"
            ;;
        *)
            error "Unknown test suite: $suite"
            exit 1
            ;;
    esac
    
    # Add Jest options
    if [[ "$VERBOSE" == "true" ]]; then
        jest_args+=" --verbose"
    fi
    
    if [[ "$COVERAGE" == "true" ]]; then
        jest_args+=" --coverage"
    fi
    
    if [[ "$BAIL_ON_FAILURE" == "true" ]]; then
        jest_args+=" --bail"
    fi
    
    # Run tests
    local exit_code=0
    if [[ -n "$jest_args" ]]; then
        eval "$jest_cmd -- $jest_args" || exit_code=$?
    else
        eval "$jest_cmd" || exit_code=$?
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [[ $exit_code -eq 0 ]]; then
        log "Test suite '$suite' completed successfully in ${duration}s"
    else
        error "Test suite '$suite' failed after ${duration}s (exit code: $exit_code)"
    fi
    
    cd - >/dev/null
    return $exit_code
}

# Generate HTML reports
generate_reports() {
    log "Generating test reports"
    
    # Check if reports exist
    local junit_report="${REPORTS_DIR}/integration-test-results.xml"
    local html_report="${REPORTS_DIR}/integration-test-report.html"
    
    if [[ -f "$junit_report" ]]; then
        info "JUnit report: $junit_report"
    fi
    
    if [[ -f "$html_report" ]]; then
        info "HTML report: $html_report"
        
        # Try to open in browser if available
        if command -v open >/dev/null 2>&1; then
            info "Opening HTML report in browser..."
            open "$html_report" 2>/dev/null || true
        elif command -v xdg-open >/dev/null 2>&1; then
            info "Opening HTML report in browser..."
            xdg-open "$html_report" 2>/dev/null || true
        fi
    fi
    
    # Generate coverage report if available
    local coverage_dir="${PROJECT_ROOT}/web/coverage"
    if [[ -d "$coverage_dir" ]]; then
        info "Coverage report: $coverage_dir/lcov-report/index.html"
        
        # Copy coverage to reports directory
        cp -r "$coverage_dir" "$REPORTS_DIR/coverage" 2>/dev/null || true
    fi
    
    log "Report generation completed"
}

# Generate reports only (without running tests)
generate_reports_only() {
    log "Generating reports from existing results"
    validate_environment
    generate_reports
}

# Show test summary
show_summary() {
    local exit_code=$1
    local suite=$2
    
    echo
    echo "=========================================="
    echo "Integration Test Summary"
    echo "=========================================="
    echo "Suite: $suite"
    echo "Status: $([ $exit_code -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")"
    echo "Reports: $REPORTS_DIR"
    echo "=========================================="
    echo
    
    if [[ $exit_code -eq 0 ]]; then
        log "All tests passed! 🎉"
    else
        error "Some tests failed. Check the reports for details."
        echo
        echo "Troubleshooting tips:"
        echo "1. Check environment variables are set correctly"
        echo "2. Ensure database is accessible and migrations are applied"
        echo "3. Check test logs for specific error messages"
        echo "4. Try running tests individually to isolate issues"
        echo
    fi
}

# Cleanup function
cleanup() {
    local exit_code=$?
    
    # Kill any background processes
    jobs -p | xargs -r kill 2>/dev/null || true
    
    exit $exit_code
}

# Main execution
main() {
    trap cleanup EXIT
    
    log "Starting DOT Attendance System Integration Tests"
    log "Suite: $TEST_SUITE"
    log "Verbose: $VERBOSE"
    log "Coverage: $COVERAGE"
    log "Bail on failure: $BAIL_ON_FAILURE"
    
    validate_environment
    ensure_dependencies
    
    local exit_code=0
    run_test_suite "$TEST_SUITE" || exit_code=$?
    
    generate_reports
    show_summary $exit_code "$TEST_SUITE"
    
    exit $exit_code
}

# Parse arguments and run
parse_arguments "$@"
main