#!/bin/bash

# CoW Protocol Performance Test Suite - Integrated with Offline Mode
# This script runs performance tests against the offline mode playground

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  CoW Protocol Performance Test Suite - Offline Mode POC     ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.offline.yml" ]; then
    echo -e "${RED}Error: docker-compose.offline.yml not found${NC}"
    echo "Please run this script from the playground directory"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}Error: Docker is not running${NC}"
    echo "Please start Docker and try again"
    exit 1
fi

# Default scenario
SCENARIO=${1:-medium}

# Validate scenario
case $SCENARIO in
    light|medium|heavy|spike|rampup|stress|soak)
        echo -e "${GREEN}Selected scenario: ${SCENARIO}${NC}"
        ;;
    *)
        echo -e "${YELLOW}Unknown scenario: ${SCENARIO}${NC}"
        echo "Available scenarios: light, medium, heavy, spike, rampup, stress, soak"
        echo ""
        echo "Usage: $0 [scenario]"
        echo "Example: $0 medium"
        exit 1
        ;;
esac

# Step 1: Check if offline mode is running
echo -e "${BLUE}Step 1: Checking if offline mode is running...${NC}"
if ! docker ps | grep -q "orderbook"; then
    echo -e "${YELLOW}Offline mode is not running. Starting it now...${NC}"
    echo "This may take a few minutes..."
    docker-compose -f docker-compose.offline.yml up -d

    echo "Waiting for services to be ready (60 seconds)..."
    sleep 60
else
    echo -e "${GREEN}✓ Offline mode is already running${NC}"
fi
echo ""

# Step 2: Build performance test suite
echo -e "${BLUE}Step 2: Building performance test suite...${NC}"
cd performance-test-suite

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo "Compiling TypeScript tests..."
npm run build

if [ ! -f "dist/load-test.js" ]; then
    echo -e "${RED}Error: Build failed - dist/load-test.js not found${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build successful${NC}"
echo ""

# Step 3: Create results directory
echo -e "${BLUE}Step 3: Preparing test environment...${NC}"
mkdir -p results
cd ..
echo -e "${GREEN}✓ Results directory ready${NC}"
echo ""

# Step 4: Run the performance test using docker-compose
echo -e "${BLUE}Step 4: Running ${SCENARIO} load test...${NC}"
echo "Target: http://orderbook (Docker network)"
echo "Prometheus: http://prometheus:9090"
echo ""
echo -e "${YELLOW}Starting test... (this may take several minutes)${NC}"
echo ""

# Build the K6 command based on scenario
case $SCENARIO in
    light)
        DURATION="2m"
        VUS="5"
        ;;
    medium)
        DURATION="5m"
        VUS="20"
        ;;
    heavy)
        DURATION="10m"
        VUS="50"
        ;;
    spike|rampup|stress|soak)
        # These use scenarios.ts configuration
        DURATION="auto"
        VUS="auto"
        ;;
esac

# Run K6 via docker-compose
docker-compose -f docker-compose.offline.yml run --rm \
    -e BASE_URL=http://orderbook \
    k6

# Check if test succeeded
if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                   Test completed successfully!                ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BLUE}Results:${NC}"
    echo "  - JSON results: performance-test-suite/results/summary.json"
    echo "  - Grafana dashboard: http://localhost:3000"
    echo "  - Prometheus: http://localhost:9090"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "  1. View metrics in Grafana: open http://localhost:3000"
    echo "  2. Query metrics in Prometheus: open http://localhost:9090"
    echo "  3. Check JSON results: cat performance-test-suite/results/summary.json"
    echo ""
else
    echo ""
    echo -e "${RED}╔══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║                        Test failed!                          ║${NC}"
    echo -e "${RED}╚══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Check the logs above for errors"
    exit 1
fi
