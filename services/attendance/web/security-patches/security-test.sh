#!/bin/bash

# ============================================================================
# Security Testing Script for Phase 3.3.2
# Tests critical vulnerabilities and validates patches
# ============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="${API_URL:-http://localhost:3000}"
ADMIN_TOKEN="${ADMIN_TOKEN:-your_admin_token}"
MASTER_ADMIN_TOKEN="${MASTER_ADMIN_TOKEN:-your_master_admin_token}"

echo "================================================"
echo "Security Testing Suite - Phase 3.3.2"
echo "================================================"
echo ""

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# ============================================================================
# Test Functions
# ============================================================================

test_result() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if [ "$1" = "PASS" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo "  Details: $3"
    fi
}

# ============================================================================
# TEST 1: MASTER_ADMIN Authorization Check
# ============================================================================

echo -e "${YELLOW}TEST 1: MASTER_ADMIN Authorization${NC}"
echo "Testing if ADMIN can perform MASTER_ADMIN operations..."

response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "$API_URL/api/master-admin/users/bulk-role-change" \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"changes": [{"user_id": "test-user", "new_role": "MASTER_ADMIN"}]}')

if [ "$response" = "403" ]; then
    test_result "PASS" "ADMIN correctly denied MASTER_ADMIN operation"
else
    test_result "FAIL" "ADMIN was able to perform MASTER_ADMIN operation" "HTTP $response"
fi

# ============================================================================
# TEST 2: SQL Injection Prevention
# ============================================================================

echo -e "\n${YELLOW}TEST 2: SQL Injection Prevention${NC}"
echo "Testing SQL injection in role change endpoint..."

response=$(curl -s -X POST \
    "$API_URL/api/master-admin/users/bulk-role-change" \
    -H "Authorization: Bearer $MASTER_ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"changes": [{"user_id": "1 OR 1=1--", "new_role": "MASTER_ADMIN"}]}')

if echo "$response" | grep -q "Validation failed\|SQL injection"; then
    test_result "PASS" "SQL injection attempt blocked"
else
    test_result "FAIL" "SQL injection not properly blocked" "$response"
fi

# ============================================================================
# TEST 3: XSS Prevention
# ============================================================================

echo -e "\n${YELLOW}TEST 3: XSS Prevention${NC}"
echo "Testing XSS in user data..."

response=$(curl -s -X POST \
    "$API_URL/api/master-admin/users" \
    -H "Authorization: Bearer $MASTER_ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"full_name": "<script>alert(1)</script>", "email": "test@example.com"}')

if echo "$response" | grep -q "&lt;script&gt;\|sanitized\|invalid"; then
    test_result "PASS" "XSS attempt sanitized"
else
    test_result "FAIL" "XSS not properly prevented" "$response"
fi

# ============================================================================
# TEST 4: Token Format Validation
# ============================================================================

echo -e "\n${YELLOW}TEST 4: Token Format Validation${NC}"
echo "Testing malformed token handling..."

response=$(curl -s -o /dev/null -w "%{http_code}" -X GET \
    "$API_URL/api/master-admin/users" \
    -H "Authorization: Bearer malformed..token!!!")

if [ "$response" = "401" ]; then
    test_result "PASS" "Malformed token rejected"
else
    test_result "FAIL" "Malformed token not properly rejected" "HTTP $response"
fi

# ============================================================================
# TEST 5: Rate Limiting
# ============================================================================

echo -e "\n${YELLOW}TEST 5: Rate Limiting${NC}"
echo "Testing rate limiting on sensitive operations..."

for i in {1..10}; do
    response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
        "$API_URL/api/master-admin/users/bulk-role-change" \
        -H "Authorization: Bearer $MASTER_ADMIN_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"changes": []}')
    
    if [ $i -gt 5 ] && [ "$response" = "429" ]; then
        test_result "PASS" "Rate limiting activated after 5 requests"
        break
    elif [ $i -eq 10 ]; then
        test_result "FAIL" "Rate limiting not working" "10 requests succeeded"
    fi
done

# ============================================================================
# TEST 6: CSRF Protection
# ============================================================================

echo -e "\n${YELLOW}TEST 6: CSRF Protection${NC}"
echo "Testing CSRF token validation..."

response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    "$API_URL/api/master-admin/users/bulk-role-change" \
    -H "Authorization: Bearer $MASTER_ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -H "X-CSRF-Token: invalid-csrf-token" \
    -d '{"changes": []}')

if [ "$response" = "403" ]; then
    test_result "PASS" "Invalid CSRF token rejected"
else
    test_result "FAIL" "CSRF protection not working" "HTTP $response"
fi

# ============================================================================
# TEST 7: Session Invalidation
# ============================================================================

echo -e "\n${YELLOW}TEST 7: Session Invalidation${NC}"
echo "Testing if sessions are invalidated after role change..."

# This would require a more complex test setup
echo "Skipping - requires active session management"

# ============================================================================
# TEST 8: PII Data Masking
# ============================================================================

echo -e "\n${YELLOW}TEST 8: PII Data Masking${NC}"
echo "Testing if PII is properly masked in responses..."

response=$(curl -s -X GET \
    "$API_URL/api/master-admin/users" \
    -H "Authorization: Bearer $MASTER_ADMIN_TOKEN")

if echo "$response" | grep -E "[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}" | head -1 | grep -q "\*\*\*\*"; then
    test_result "PASS" "Email addresses are masked"
else
    test_result "FAIL" "PII not properly masked" "Emails visible in response"
fi

# ============================================================================
# TEST 9: Audit Log Tampering
# ============================================================================

echo -e "\n${YELLOW}TEST 9: Audit Log Integrity${NC}"
echo "Testing audit log immutability..."

# This would require database access to verify
echo "Skipping - requires database access"

# ============================================================================
# TEST 10: Input Validation
# ============================================================================

echo -e "\n${YELLOW}TEST 10: Input Validation${NC}"
echo "Testing input validation on bulk operations..."

response=$(curl -s -X POST \
    "$API_URL/api/master-admin/users/bulk-role-change" \
    -H "Authorization: Bearer $MASTER_ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"changes": [{"user_id": "not-a-uuid", "new_role": "INVALID_ROLE"}]}')

if echo "$response" | grep -q "Validation failed"; then
    test_result "PASS" "Invalid input rejected"
else
    test_result "FAIL" "Invalid input not properly validated" "$response"
fi

# ============================================================================
# Performance Tests
# ============================================================================

echo -e "\n${YELLOW}Performance Under Attack${NC}"
echo "Testing system resilience..."

# Concurrent requests test
echo "Sending 100 concurrent requests..."
for i in {1..100}; do
    curl -s -o /dev/null -w "%{http_code}\n" -X GET \
        "$API_URL/api/master-admin/users" \
        -H "Authorization: Bearer $MASTER_ADMIN_TOKEN" &
done | grep -c "200" > /tmp/success_count 2>/dev/null

wait

success_count=$(cat /tmp/success_count 2>/dev/null || echo "0")
if [ "$success_count" -gt "50" ]; then
    test_result "PASS" "System handled concurrent load ($success_count/100 succeeded)"
else
    test_result "FAIL" "System failed under load" "Only $success_count/100 succeeded"
fi

# ============================================================================
# Summary
# ============================================================================

echo ""
echo "================================================"
echo "Security Test Summary"
echo "================================================"
echo -e "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}✓ All security tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Security vulnerabilities detected!${NC}"
    echo "Please apply security patches before deployment."
    exit 1
fi