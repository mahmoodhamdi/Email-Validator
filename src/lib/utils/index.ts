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
