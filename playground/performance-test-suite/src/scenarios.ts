/**
 * Test Scenarios Configuration
 * Defines various load testing scenarios for CoW Protocol
 */

import { Options } from 'k6/options';

/**
 * Light Load Scenario
 * - Low sustained traffic
 * - Good for smoke testing and basic validation
 */
export const lightLoadScenario: Options = {
  scenarios: {
    light_load: {
      executor: 'constant-vus',
      vus: 5,
      duration: '2m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests should be below 500ms
    http_req_failed: ['rate<0.01'],    // Error rate should be below 1%
  },
};

/**
 * Medium Load Scenario
 * - Moderate sustained traffic
 * - Represents typical production load
 */
export const mediumLoadScenario: Options = {
  scenarios: {
    medium_load: {
      executor: 'constant-vus',
      vus: 20,
      duration: '5m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};

/**
 * Heavy Load Scenario
 * - High sustained traffic
 * - Tests system under stress
 */
export const heavyLoadScenario: Options = {
  scenarios: {
    heavy_load: {
      executor: 'constant-vus',
      vus: 50,
      duration: '10m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    http_req_failed: ['rate<0.10'],
  },
};

/**
 * Spike Load Scenario
 * - Sudden traffic spike
 * - Tests system elasticity and recovery
 */
export const spikeLoadScenario: Options = {
  scenarios: {
    spike_load: {
      executor: 'ramping-vus',
      startVUs: 5,
      stages: [
        { duration: '1m', target: 5 },   // Normal load
        { duration: '30s', target: 100 }, // Spike up
        { duration: '2m', target: 100 },  // Stay at spike
        { duration: '1m', target: 5 },    // Spike down
        { duration: '1m', target: 5 },    // Recovery
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<3000'],
    http_req_failed: ['rate<0.15'],
  },
};

/**
 * Sustained Ramp-up Scenario
 * - Gradual traffic increase
 * - Tests system scaling behavior
 */
export const rampUpScenario: Options = {
  scenarios: {
    ramp_up: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '2m', target: 10 },
        { duration: '3m', target: 30 },
        { duration: '3m', target: 50 },
        { duration: '2m', target: 10 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    http_req_failed: ['rate<0.05'],
  },
};

/**
 * Stress Test Scenario
 * - Push system to its limits
 * - Find breaking point
 */
export const stressTestScenario: Options = {
  scenarios: {
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 1,
      stages: [
        { duration: '2m', target: 50 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 150 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<5000'],
    http_req_failed: ['rate<0.20'],
  },
};

/**
 * Soak Test Scenario
 * - Long-duration test
 * - Detects memory leaks and degradation over time
 */
export const soakTestScenario: Options = {
  scenarios: {
    soak_test: {
      executor: 'constant-vus',
      vus: 30,
      duration: '30m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

/**
 * Get scenario by name
 */
export function getScenario(name: string): Options {
  const scenarios: Record<string, Options> = {
    light: lightLoadScenario,
    medium: mediumLoadScenario,
    heavy: heavyLoadScenario,
    spike: spikeLoadScenario,
    rampup: rampUpScenario,
    stress: stressTestScenario,
    soak: soakTestScenario,
  };

  return scenarios[name] || mediumLoadScenario;
}

/**
 * List all available scenarios
 */
export function listScenarios(): string[] {
  return ['light', 'medium', 'heavy', 'spike', 'rampup', 'stress', 'soak'];
}
