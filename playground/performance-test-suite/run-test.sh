#!/bin/bash

# CoW Protocol Performance Test Suite - Quick Start Script

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}CoW Protocol Performance Test Suite${NC}"
echo "========================================"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo -e "${YELLOW}Warning: k6 is not installed${NC}"
    echo "Please install k6: https://k6.io/docs/get-started/installation/"
    echo ""
    echo "macOS: brew install k6"
    echo "Linux: sudo apt-get install k6"
    echo ""
    exit 1
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
    echo ""
fi

# Build the project
echo -e "${GREEN}Building TypeScript tests...${NC}"
npm run build
echo ""

# Get scenario from argument or default to medium
SCENARIO=${1:-medium}
BASE_URL=${BASE_URL:-http://localhost:8080}

echo -e "${GREEN}Running ${SCENARIO} load test...${NC}"
echo "Target: ${BASE_URL}"
echo ""

# Run the appropriate test
case $SCENARIO in
    light)
        npm run test:light
        ;;
    medium)
        npm run test:medium
        ;;
    heavy)
        npm run test:heavy
        ;;
    spike)
        npm run test:spike
        ;;
    rampup)
        npm run test:rampup
        ;;
    stress)
        npm run test:stress
        ;;
    soak)
        npm run test:soak
        ;;
    *)
        echo -e "${YELLOW}Unknown scenario: ${SCENARIO}${NC}"
        echo "Available scenarios: light, medium, heavy, spike, rampup, stress, soak"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}Test completed!${NC}"
