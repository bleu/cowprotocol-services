/**
 * CoW Protocol Performance Test Suite - Main Load Test
 * K6 test script for load testing the CoW Protocol Playground
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { getSignedOrderRoundRobin, getPoolStats } from './signed-order-pool';
import { getScenario } from './scenarios';
import execution from 'k6/execution';

// Custom metrics - Counters
const ordersSubmitted = new Counter('orders_submitted');
const ordersAccepted = new Counter('orders_accepted');
const ordersFailed = new Counter('orders_failed');

// HTTP Status Code Counters
const status201 = new Counter('http_status_201');
const status400 = new Counter('http_status_400');
const status404 = new Counter('http_status_404');
const status500 = new Counter('http_status_500');

// Error Type Counters
const errorInsufficientBalance = new Counter('error_insufficient_balance');
const errorInsufficientAllowance = new Counter('error_insufficient_allowance');
const errorDuplicateOrder = new Counter('error_duplicate_order');
const errorNonZeroFee = new Counter('error_non_zero_fee');
const errorExcessiveValidTo = new Counter('error_excessive_valid_to');
const errorWrongOwner = new Counter('error_wrong_owner');
const errorOther = new Counter('error_other');

// Rates
const orderAcceptanceRate = new Rate('order_acceptance_rate');
const successRate = new Rate('success_rate');

// Trends
const orderSubmissionDuration = new Trend('order_submission_duration');
const successfulOrderDuration = new Trend('successful_order_duration');
const failedOrderDuration = new Trend('failed_order_duration');

// Test configuration from environment variables
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const ORDERBOOK_API = `${BASE_URL}/api/v1`;

// K6 options - use scenario from environment or default to medium load
const scenarioName = __ENV.SCENARIO || 'medium';
export const options = getScenario(scenarioName);

/**
 * Setup function - runs once before test
 */
export function setup() {
  console.log('Starting CoW Protocol Performance Test');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Scenario: ${scenarioName}`);
  console.log(`Configuration: ${JSON.stringify(options.scenarios)}`);

  // Get pool stats
  const poolStats = getPoolStats();
  console.log(`Pre-signed orders loaded: ${poolStats.totalOrders}`);
  console.log(`Memory usage: ${(poolStats.memoryUsage / 1024 / 1024).toFixed(2)} MB`);

  // Verify API is accessible
  const healthCheck = http.get(`${BASE_URL}/health`);
  if (healthCheck.status !== 200) {
    console.warn(`Warning: Health check failed with status ${healthCheck.status}`);
  }

  return {
    startTime: Date.now(),
  };
}

/**
 * Main test function - runs for each VU iteration
 */
export default function (data: any) {
  // Get a pre-signed order from the pool using round-robin
  // This ensures each order is used sequentially across all VUs
  const globalIteration = execution.scenario.iterationInTest;
  const order = getSignedOrderRoundRobin(globalIteration);

  // Submit order to orderbook API
  const payload = JSON.stringify(order);
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: {
      name: 'SubmitOrder',
    },
  };

  const startTime = Date.now();
  const response = http.post(`${ORDERBOOK_API}/orders`, payload, params);
  const duration = Date.now() - startTime;

  // Record basic metrics
  ordersSubmitted.add(1);
  orderSubmissionDuration.add(duration);

  // Record HTTP status codes
  if (response.status === 201) {
    status201.add(1);
    ordersAccepted.add(1);
    orderAcceptanceRate.add(1);
    successRate.add(1);
    successfulOrderDuration.add(duration);
  } else if (response.status === 400) {
    status400.add(1);
    ordersFailed.add(1);
    orderAcceptanceRate.add(0);
    successRate.add(0);
    failedOrderDuration.add(duration);

    // Parse error type from response body
    try {
      const errorBody = JSON.parse(response.body as string);
      const errorType = errorBody.errorType || '';

      switch (errorType) {
        case 'InsufficientBalance':
          errorInsufficientBalance.add(1);
          break;
        case 'InsufficientAllowance':
          errorInsufficientAllowance.add(1);
          break;
        case 'DuplicateOrder':
          errorDuplicateOrder.add(1);
          break;
        case 'NonZeroFee':
          errorNonZeroFee.add(1);
          break;
        case 'ExcessiveValidTo':
          errorExcessiveValidTo.add(1);
          break;
        case 'WrongOwner':
          errorWrongOwner.add(1);
          break;
        default:
          errorOther.add(1);
      }
    } catch {
      errorOther.add(1);
    }

    console.log(`Order submission failed: ${response.status} - ${response.body}`);
  } else if (response.status === 404) {
    status404.add(1);
    ordersFailed.add(1);
    orderAcceptanceRate.add(0);
    successRate.add(0);
    failedOrderDuration.add(duration);
    console.log(`Order submission failed: ${response.status} - ${response.body}`);
  } else if (response.status >= 500) {
    status500.add(1);
    ordersFailed.add(1);
    orderAcceptanceRate.add(0);
    successRate.add(0);
    failedOrderDuration.add(duration);
    console.log(`Order submission failed: ${response.status} - ${response.body}`);
  } else {
    ordersFailed.add(1);
    orderAcceptanceRate.add(0);
    successRate.add(0);
    failedOrderDuration.add(duration);
    console.log(`Order submission failed: ${response.status} - ${response.body}`);
  }

  // Check response
  check(response, {
    'status is 201': (r) => r.status === 201,
    'response has order UID': (r) => {
      try {
        const body = JSON.parse(r.body as string);
        return body.hasOwnProperty('orderUid') || body.hasOwnProperty('uid');
      } catch {
        return false;
      }
    },
    'response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  // Random think time between requests (0.5 - 2 seconds)
  sleep(Math.random() * 1.5 + 0.5);
}

/**
 * Teardown function - runs once after test
 */
export function teardown(data: any) {
  const duration = (Date.now() - data.startTime) / 1000;
  console.log('\nTest completed');
  console.log(`Duration: ${duration.toFixed(2)} seconds`);
  console.log('Check k6 output above for detailed metrics');
}
