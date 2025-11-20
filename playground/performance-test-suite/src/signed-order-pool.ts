/**
 * Signed Order Pool
 * Manages a pool of pre-signed orders for K6 load testing
 */

import { SharedArray } from 'k6/data';

// Load pre-signed orders from JSON file
// SharedArray ensures orders are loaded once and shared across all VUs
export const signedOrders = new SharedArray('signedOrders', function () {
  // Read the signed orders file
  const data = open('../signed-orders.json');
  return JSON.parse(data);
});

/**
 * Get a random signed order from the pool
 */
export function getRandomSignedOrder() {
  const index = Math.floor(Math.random() * signedOrders.length);
  return signedOrders[index];
}

/**
 * Get a signed order by round-robin
 * Use VU iteration to distribute orders evenly
 */
export function getSignedOrderRoundRobin(iteration: number) {
  const index = iteration % signedOrders.length;
  return signedOrders[index];
}

/**
 * Get pool statistics
 */
export function getPoolStats() {
  return {
    totalOrders: signedOrders.length,
    memoryUsage: JSON.stringify(signedOrders).length,
  };
}
