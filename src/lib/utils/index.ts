/**
 * Utility functions for the Email Validator.
 */

export {
  TimeoutError,
  withTimeout,
  fetchWithTimeout,
  isTimeoutError,
  isAbortError,
  type TimeoutOptions,
} from './timeout';

export {
  CircuitBreaker,
  CircuitState,
  CircuitOpenError,
  getCircuitBreaker,
  resetCircuitBreaker,
  getAllCircuitStats,
  type CircuitBreakerConfig,
  type CircuitStats,
} from './circuit-breaker';

/**
 * Create a promise that resolves after the given delay.
 *
 * @param ms - Delay in milliseconds
 * @returns Promise that resolves after the delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
