# CoW Protocol Performance Test Suite - POC

A proof-of-concept performance testing suite for the CoW Protocol Playground using K6 and TypeScript.

## 🚀 Quick Start (Integrated with Offline Mode)

**The test suite is now fully integrated with the offline mode!**

```bash
# From the playground directory
cd performance-test-suite
./run-with-offline-mode.sh medium
```

That's it! The script will:
- ✅ Start offline mode if not running
- ✅ Build the test suite
- ✅ Run performance tests
- ✅ Show results and dashboard links

**See [OFFLINE_MODE_INTEGRATION.md](OFFLINE_MODE_INTEGRATION.md) for complete integration guide.**

## Overview

This POC demonstrates the key components of the performance testing suite proposed in the grant application:

- **Load Generation Framework**: Synthetic order generation using TypeScript
- **K6 Integration**: Industry-standard load testing tool with Grafana integration
- **Multiple Test Scenarios**: Pre-configured scenarios (light, medium, heavy, spike, etc.)
- **Metrics Collection**: Prometheus integration for metrics storage
- **Visualization**: Grafana dashboards for real-time monitoring
- **Docker Integration**: Easy deployment alongside offline mode playground

## Architecture

```
┌─────────────────┐
│   K6 Runner     │  Executes TypeScript load tests
│  (TypeScript)   │  Generates synthetic orders
└────────┬────────┘
         │
         ├──────────► ┌──────────────────┐
         │            │  CoW Orderbook   │  Target API
         │            │      API         │
         │            └──────────────────┘
         │
         ├──────────► ┌──────────────────┐
         │            │   Prometheus     │  Metrics storage
         └────────────┤                  │
                      └────────┬─────────┘
                               │
                               ▼
                      ┌──────────────────┐
                      │     Grafana      │  Visualization
                      │   Dashboards     │
                      └──────────────────┘
```

## Prerequisites

- Node.js 18+ and npm
- [K6](https://k6.io/docs/get-started/installation/) installed locally
- Docker and Docker Compose (for containerized testing)
- CoW Protocol Playground running (offline mode or fork mode)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Build TypeScript Tests

```bash
npm run build
```

### 3. Run a Test Scenario

```bash
# Run medium load test (default)
npm test

# Or run specific scenarios
npm run test:light     # Light load (5 VUs, 2 minutes)
npm run test:medium    # Medium load (20 VUs, 5 minutes)
npm run test:heavy     # Heavy load (50 VUs, 10 minutes)
npm run test:spike     # Spike test (sudden traffic surge)
npm run test:rampup    # Gradual ramp-up
npm run test:stress    # Stress test (push to limits)
npm run test:soak      # Soak test (30 minutes sustained)
```

### 4. Run with Docker Compose

```bash
# Start the full stack (K6 + Prometheus + Grafana)
docker-compose -f docker-compose.perf-test.yml up

# Access Grafana dashboard
open http://localhost:3000
# Login: admin / admin
```

## Test Scenarios

### Light Load
- **VUs**: 5
- **Duration**: 2 minutes
- **Use Case**: Smoke testing, basic validation

### Medium Load
- **VUs**: 20
- **Duration**: 5 minutes
- **Use Case**: Typical production load simulation

### Heavy Load
- **VUs**: 50
- **Duration**: 10 minutes
- **Use Case**: Stress testing under high load

### Spike Test
- **Pattern**: 5 → 100 → 5 VUs
- **Duration**: 5.5 minutes
- **Use Case**: Test elasticity and recovery

### Ramp-up Test
- **Pattern**: Gradual increase from 1 to 50 VUs
- **Duration**: 10 minutes
- **Use Case**: Test scaling behavior

### Stress Test
- **Pattern**: Increase from 1 to 200 VUs
- **Duration**: 16 minutes
- **Use Case**: Find system breaking point

### Soak Test
- **VUs**: 30
- **Duration**: 30 minutes
- **Use Case**: Detect memory leaks and degradation

## Configuration

### Environment Variables

Configure tests using environment variables:

```bash
# Set target API URL
export BASE_URL=http://localhost:8080

# Run test
npm test

# Or inline
BASE_URL=http://localhost:8080 npm run test:medium
```

### Custom Configuration

Copy and modify the example configuration:

```bash
cp config.example.json config.json
# Edit config.json with your settings
```

### Token Pairs

Update token pairs in `src/load-test.ts` to match your deployment:

```typescript
const TOKEN_PAIRS: TokenPair[] = [
  {
    name: 'WETH/USDC',
    sellToken: '0xYourTokenAddress',
    buyToken: '0xYourTokenAddress',
  },
  // Add more pairs...
];
```

## Metrics and Thresholds

### Custom Metrics

The test suite tracks:

- `orders_submitted`: Total orders submitted
- `orders_accepted`: Orders accepted by API
- `orders_failed`: Failed order submissions
- `order_acceptance_rate`: Success rate
- `order_submission_duration`: Time to submit order

### Default Thresholds

```typescript
http_req_duration: ['p(95)<1000']  // 95th percentile < 1s
http_req_failed: ['rate<0.05']     // Error rate < 5%
```

## Viewing Results

### Console Output

K6 provides detailed console output:

```
     ✓ status is 201
     ✓ response has order UID
     ✓ response time < 1000ms

     checks.........................: 100.00% ✓ 3000  ✗ 0
     data_received..................: 1.5 MB  25 kB/s
     data_sent......................: 750 kB  12 kB/s
     http_req_duration..............: avg=245ms min=120ms med=230ms max=890ms p(95)=450ms
     http_reqs......................: 1000    16.67/s
     orders_submitted...............: 1000    16.67/s
     orders_accepted................: 980     16.33/s
     order_acceptance_rate..........: 98.00%  ✓ 980   ✗ 20
```

### Grafana Dashboard

Access Grafana at `http://localhost:3000` when running with Docker Compose:

1. **Login**: admin / admin
2. **Navigate**: CoW Protocol Performance Tests dashboard
3. **View Metrics**:
   - HTTP Request Rate
   - Request Duration Percentiles (p50, p95, p99)
   - Error Rate
   - Virtual Users (VUs)

### Prometheus Queries

Access Prometheus at `http://localhost:9090`:

```promql
# Request rate
rate(k6_http_reqs[1m])

# 95th percentile latency
histogram_quantile(0.95, rate(k6_http_req_duration_bucket[1m]))

# Error rate
rate(k6_http_req_failed[1m])
```

## Project Structure

```
performance-test-suite/
├── src/
│   ├── load-test.ts           # Main K6 test script
│   ├── order-generator.ts     # Order generation logic
│   └── scenarios.ts           # Test scenario definitions
├── dist/                      # Compiled JavaScript output
├── grafana/
│   ├── provisioning/          # Grafana datasource config
│   └── dashboards/            # Dashboard JSON definitions
├── prometheus/
│   └── prometheus.yml         # Prometheus configuration
├── results/                   # Test results output
├── package.json               # npm dependencies
├── tsconfig.json             # TypeScript configuration
├── webpack.config.js         # Webpack bundling config
├── docker-compose.perf-test.yml  # Docker compose setup
└── README.md                 # This file
```

## Integration with Offline Mode

The test suite is **fully integrated** with the offline mode:

### Using the Helper Script (Recommended)

```bash
./run-with-offline-mode.sh medium
```

### Manual Integration

1. **Start offline mode**:
   ```bash
   cd ..
   docker-compose -f docker-compose.offline.yml up -d
   ```

2. **Build and run tests**:
   ```bash
   cd performance-test-suite
   npm install && npm run build
   cd ..
   docker-compose -f docker-compose.offline.yml run --rm k6
   ```

3. **View results**:
   - Grafana: http://localhost:3000
   - Prometheus: http://localhost:9090
   - JSON: `performance-test-suite/results/summary.json`

**Complete integration guide**: [OFFLINE_MODE_INTEGRATION.md](OFFLINE_MODE_INTEGRATION.md)

## Development

### Watch Mode

Auto-rebuild on file changes:

```bash
npm run watch
```

### Adding Custom Scenarios

Edit `src/scenarios.ts`:

```typescript
export const customScenario: Options = {
  scenarios: {
    custom: {
      executor: 'constant-vus',
      vus: 30,
      duration: '10m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<800'],
    http_req_failed: ['rate<0.03'],
  },
};
```

### Extending Order Generation

Modify `src/order-generator.ts` to:
- Add new token pairs
- Implement custom order patterns
- Add signature generation
- Customize order parameters

## Limitations (POC)

This POC demonstrates the core concepts but has some limitations:

1. **Simplified Order Structure**: Orders are not signed with real signatures
2. **Token Addresses**: Uses example addresses, needs deployment-specific configuration
3. **No Order Tracking**: Does not track order settlement, only submission
4. **Basic Metrics**: Limited to HTTP-level metrics, not order lifecycle metrics
5. **No Baseline Comparison**: Does not implement regression detection

## Next Steps (Full Implementation)

Based on the grant milestones:

### M1: Load Generation Framework ✓ (POC Complete)
- [x] Order generation engine
- [x] Multiple concurrent traders simulation
- [x] CLI tool interface
- [x] Order submission strategies

### M2: Performance Benchmarking (TODO)
- [ ] Order lifecycle timing (submission → settlement)
- [ ] Baseline snapshot system
- [ ] Regression detection algorithms
- [ ] Automated reporting

### M3: Metrics & Visualization (Partially Complete)
- [x] Prometheus integration
- [x] Basic Grafana dashboards
- [ ] Custom performance metrics exporter
- [ ] Alert rules configuration

### M4: Test Scenarios ✓ (POC Complete)
- [x] Predefined scenario library
- [x] Configuration system
- [x] Example scenarios with documentation

### M5: Integration & Documentation (TODO)
- [ ] End-to-end integration with offline mode
- [ ] Fork mode exploration
- [ ] Comprehensive documentation
- [ ] Performance overhead measurement

## Resources

- [K6 Documentation](https://k6.io/docs/)
- [K6 TypeScript Support](https://k6.io/docs/using-k6/test-authoring/create-tests-from-recordings/)
- [Prometheus Integration](https://k6.io/docs/results-output/real-time/prometheus-remote-write/)
- [Grafana Dashboards](https://grafana.com/grafana/dashboards/)
- [CoW Protocol Documentation](https://docs.cow.fi/)

## Contributing

This is a POC for the grant application. Future contributions will follow CoW Protocol standards.

## License

MIT

## Authors

bleu - @yvesfracari @ribeirojose @mendesfabio @lgahdl
