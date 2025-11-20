/**
 * CoW Protocol Performance Test Suite - Main Load Test
 * K6 test script for load testing the CoW Protocol Playground
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { getSignedOrderRoundRobin, getPoolStats } from './signed-order-pool';
import { mediumLoadScenario } from './scenarios';
import execution from 'k6/execution';

// Custom metrics
const ordersSubmitted = new Counter('orders_submitted');
const ordersAccepted = new Counter('orders_accepted');
const ordersFailed = new Counter('orders_failed');
const orderAcceptanceRate = new Rate('order_acceptance_rate');
const orderSubmissionDuration = new Trend('order_submission_duration');

// Test configuration from environment variables
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const ORDERBOOK_API = `${BASE_URL}/api/v1`;

// K6 options - use scenario from environment or default to medium load
export const options = mediumLoadScenario;

/**
 * Setup function - runs once before test
 */
export function setup() {
  console.log('Starting CoW Protocol Performance Test');
  console.log(`Target: ${BASE_URL}`);
  console.log(`Scenario: ${JSON.stringify(options.scenarios)}`);

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

  // Record metrics
  ordersSubmitted.add(1);
  orderSubmissionDuration.add(duration);

  // Check response
  const success = check(response, {
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

  if (response.status === 201) {
    ordersAccepted.add(1);
    orderAcceptanceRate.add(1);
  } else {
    ordersFailed.add(1);
    orderAcceptanceRate.add(0);
    console.log(`Order submission failed: ${response.status} - ${response.body}`);
  }

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
