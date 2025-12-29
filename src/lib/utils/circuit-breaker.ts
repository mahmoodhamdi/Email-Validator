/**
 * Circuit breaker pattern implementation.
 * Prevents cascade failures by tracking error rates and temporarily
 * stopping requests to failing services.
 */

/**
 * Circuit breaker states.
 */
export enum CircuitState {
  /** Circuit is closed, requests pass through normally */
  CLOSED = 'CLOSED',
  /** Circuit is open, requests are rejected immediately */
  OPEN = 'OPEN',
  /** Circuit is testing if the service has recovered */
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit breaker configuration.
 */
export interface CircuitBreakerConfig {
  /** Number of consecutive failures before opening the circuit */
  failureThreshold: number;
  /** Time in ms before attempting to close the circuit (reset timeout) */
  resetTimeoutMs: number;
  /** Number of successful requests in HALF_OPEN state before closing */
  successThreshold: number;
}

/**
 * Circuit breaker statistics.
 */
export interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

/**
 * Error thrown when the circuit is open.
 */
export class CircuitOpenError extends Error {
  public readonly resetTimeMs: number;

  constructor(message: string, resetTimeMs: number) {
    super(message);
    this.name = 'CircuitOpenError';
    this.resetTimeMs = resetTimeMs;
  }
}

/**
 * Default circuit breaker configuration.
 */
const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30000, // 30 seconds
  successThreshold: 2,
};

/**
 * Circuit breaker implementation.
 * Tracks failures and successes to determine when to open/close the circuit.
 */
export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private state: CircuitState = CircuitState.CLOSED;
  private failures: number = 0;
  private successes: number = 0;
  private lastFailureTime: number | null = null;
  private lastSuccessTime: number | null = null;
  private totalRequests: number = 0;
  private totalFailures: number = 0;
  private totalSuccesses: number = 0;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get the current state of the circuit.
   */
  getState(): CircuitState {
    // Check if we should transition from OPEN to HALF_OPEN
    if (
      this.state === CircuitState.OPEN &&
      this.lastFailureTime !== null &&
      Date.now() - this.lastFailureTime >= this.config.resetTimeoutMs
    ) {
      this.state = CircuitState.HALF_OPEN;
      this.successes = 0;
    }

    return this.state;
  }

  /**
   * Get circuit breaker statistics.
   */
  getStats(): CircuitStats {
    return {
      state: this.getState(),
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      totalRequests: this.totalRequests,
      totalFailures: this.totalFailures,
      totalSuccesses: this.totalSuccesses,
    };
  }

  /**
   * Check if a request is allowed through the circuit.
   * @throws CircuitOpenError if the circuit is open
   */
  canRequest(): boolean {
    const state = this.getState();

    if (state === CircuitState.OPEN) {
      const timeUntilReset = this.lastFailureTime !== null
        ? this.config.resetTimeoutMs - (Date.now() - this.lastFailureTime)
        : this.config.resetTimeoutMs;

      throw new CircuitOpenError(
        'Circuit breaker is open - service is temporarily unavailable',
        Math.max(0, timeUntilReset)
      );
    }

    return true;
  }

  /**
   * Execute a function through the circuit breaker.
   *
   * @param fn - The function to execute
   * @param fallback - Optional fallback value if circuit is open
   * @returns The result of the function or fallback
   */
  async execute<T>(fn: () => Promise<T>, fallback?: T): Promise<T> {
    this.totalRequests++;

    try {
      this.canRequest();
    } catch (error) {
      if (error instanceof CircuitOpenError && fallback !== undefined) {
        return fallback;
      }
      throw error;
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  /**
   * Record a successful request.
   */
  recordSuccess(): void {
    this.totalSuccesses++;
    this.lastSuccessTime = Date.now();

    const state = this.getState();

    if (state === CircuitState.HALF_OPEN) {
      this.successes++;

      if (this.successes >= this.config.successThreshold) {
        // Close the circuit
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        this.successes = 0;
      }
    } else if (state === CircuitState.CLOSED) {
      // Reset failure count on success
      this.failures = 0;
    }
  }

  /**
   * Record a failed request.
   */
  recordFailure(): void {
    this.totalFailures++;
    this.lastFailureTime = Date.now();

    const state = this.getState();

    if (state === CircuitState.HALF_OPEN) {
      // Any failure in HALF_OPEN state opens the circuit again
      this.state = CircuitState.OPEN;
      this.failures = this.config.failureThreshold;
    } else if (state === CircuitState.CLOSED) {
      this.failures++;

      if (this.failures >= this.config.failureThreshold) {
        this.state = CircuitState.OPEN;
      }
    }
  }

  /**
   * Manually reset the circuit breaker to CLOSED state.
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.successes = 0;
  }

  /**
   * Check if the circuit is currently open.
   */
  isOpen(): boolean {
    return this.getState() === CircuitState.OPEN;
  }
}

/**
 * Global circuit breakers for different services.
 */
const circuitBreakers = new Map<string, CircuitBreaker>();

/**
 * Get or create a circuit breaker for a service.
 *
 * @param serviceName - Name of the service
 * @param config - Optional configuration
 * @returns CircuitBreaker instance
 */
export function getCircuitBreaker(
  serviceName: string,
  config?: Partial<CircuitBreakerConfig>
): CircuitBreaker {
  if (!circuitBreakers.has(serviceName)) {
    circuitBreakers.set(serviceName, new CircuitBreaker(config));
  }

  return circuitBreakers.get(serviceName)!;
}

/**
 * Reset a circuit breaker for a service.
 *
 * @param serviceName - Name of the service
 */
export function resetCircuitBreaker(serviceName: string): void {
  const breaker = circuitBreakers.get(serviceName);
  if (breaker) {
    breaker.reset();
  }
}

/**
 * Get statistics for all circuit breakers.
 */
export function getAllCircuitStats(): Record<string, CircuitStats> {
  const stats: Record<string, CircuitStats> = {};

  for (const [name, breaker] of circuitBreakers) {
    stats[name] = breaker.getStats();
  }

  return stats;
}
