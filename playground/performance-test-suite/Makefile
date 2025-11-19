.PHONY: help install build test clean docker-up docker-down docker-logs

# Default target
help:
	@echo "CoW Protocol Performance Test Suite - POC"
	@echo ""
	@echo "Available targets:"
	@echo "  make install       - Install dependencies"
	@echo "  make build         - Build TypeScript tests"
	@echo "  make test          - Run medium load test"
	@echo "  make test-light    - Run light load test"
	@echo "  make test-medium   - Run medium load test"
	@echo "  make test-heavy    - Run heavy load test"
	@echo "  make test-spike    - Run spike test"
	@echo "  make test-stress   - Run stress test"
	@echo "  make clean         - Remove build artifacts"
	@echo "  make docker-up     - Start monitoring stack (Prometheus + Grafana)"
	@echo "  make docker-down   - Stop monitoring stack"
	@echo "  make docker-logs   - View docker logs"
	@echo ""
	@echo "Environment variables:"
	@echo "  BASE_URL          - Target API URL (default: http://localhost:8080)"
	@echo ""
	@echo "Example:"
	@echo "  make install"
	@echo "  make build"
	@echo "  make test-light"
	@echo "  BASE_URL=http://custom:8080 make test"

# Install dependencies
install:
	npm install

# Build TypeScript
build:
	npm run build

# Run tests
test: build
	npm test

test-light: build
	npm run test:light

test-medium: build
	npm run test:medium

test-heavy: build
	npm run test:heavy

test-spike: build
	npm run test:spike

test-rampup: build
	npm run test:rampup

test-stress: build
	npm run test:stress

test-soak: build
	npm run test:soak

# Clean build artifacts
clean:
	npm run clean

# Docker commands
docker-up:
	docker-compose -f docker-compose.perf-test.yml up -d
	@echo ""
	@echo "Monitoring stack started!"
	@echo "Grafana: http://localhost:3000 (admin/admin)"
	@echo "Prometheus: http://localhost:9090"

docker-down:
	docker-compose -f docker-compose.perf-test.yml down

docker-logs:
	docker-compose -f docker-compose.perf-test.yml logs -f

# Full workflow
all: install build test
