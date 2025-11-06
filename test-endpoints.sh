#!/bin/bash
# Quick API Endpoint Testing Script
# Tests all RMF3 and HMAI endpoints to verify they're working

set -e

API_BASE="http://localhost:3090/api/v2"
WEB_URL="http://localhost:3000"

echo "========================================="
echo "Zebra HMAI API Endpoint Test"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to test endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local expected_status=$3
    local description=$4
    
    echo -n "Testing: $description... "
    
    response=$(curl -s -w "\n%{http_code}" -X $method "$API_BASE$endpoint" 2>&1)
    status_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASS${NC} (HTTP $status_code)"
        echo "  Response: $(echo $body | head -c 100)..."
    else
        echo -e "${RED}✗ FAIL${NC} (Expected $expected_status, got $status_code)"
        echo "  Response: $body"
    fi
    echo ""
}

echo "=== Health Checks ==="
test_endpoint GET "/health" "200" "Health endpoint"

echo "=== RMF Monitor III Endpoints ==="
test_endpoint GET "/rmf3/lpars" "200" "Get LPARs list"
test_endpoint GET "/rmf3/report-types" "200" "Get report types"

echo "=== HMAI Endpoints ==="
test_endpoint GET "/hmai/metrics" "200" "Get available metrics"
test_endpoint GET "/hmai/LPAR1/ingestion/status" "200" "Get ingestion status for LPAR1"

echo ""
echo "=== Frontend Check ==="
echo -n "Testing: Web frontend... "
if curl -s "$WEB_URL" | grep -q "Zebra HMAI"; then
    echo -e "${GREEN}✓ PASS${NC}"
    echo "  Web UI is running at $WEB_URL"
else
    echo -e "${RED}✗ FAIL${NC}"
    echo "  Web UI may not be running"
fi

echo ""
echo "========================================="
echo "Test Summary"
echo "========================================="
echo ""
echo "API Endpoints:"
echo "  - RMF3 LPARs:         /rmf3/lpars"
echo "  - RMF3 Report Types:  /rmf3/report-types"
echo "  - RMF3 Get Report:    /rmf3/:lpar/:reportType"
echo "  - HMAI Metrics:       /hmai/metrics"
echo "  - HMAI Start:         /hmai/:lpar/ingestion/start (POST)"
echo "  - HMAI Stop:          /hmai/:lpar/ingestion/stop (POST)"
echo "  - HMAI Status:        /hmai/:lpar/ingestion/status"
echo ""
echo "Frontend Pages:"
echo "  - Dashboard:          $WEB_URL/dashboard"
echo "  - RMF Monitor III:    $WEB_URL/rmf3"
echo "  - HMAI Ingestion:     $WEB_URL/hmai"
echo ""
echo "Configuration:"
echo "  - Zconfig.json:       config/Zconfig.json"
echo "  - HMAI Memory:        config/hmaiMemory/LPAR1.json"
echo "  - API Port:           3090"
echo "  - Web Port:           3000"
echo "  - Auth Disabled:      DISABLE_AUTH=true"
echo ""
echo "========================================="

# Test specific RMF3 report (will fail with example credentials, but tests routing)
echo ""
echo "=== Extended Test (Expected to fail with example credentials) ==="
echo "Testing: RMF3 CPC report for LPAR1 (will fail if DDS not configured)..."
response=$(curl -s -w "\n%{http_code}" "$API_BASE/rmf3/LPAR1/CPC" 2>&1)
status_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')
echo "  Status: $status_code"
echo "  Response: $(echo $body | head -c 150)..."
if [ "$status_code" = "200" ]; then
    echo -e "${GREEN}  ✓ DDS connection successful!${NC}"
elif [ "$status_code" = "500" ]; then
    echo -e "${YELLOW}  ⚠ Expected failure - DDS credentials not configured${NC}"
else
    echo -e "${YELLOW}  ⚠ Response: $status_code${NC}"
fi

echo ""
echo "========================================="
echo "Test Complete!"
echo "========================================="

