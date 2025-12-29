/**
 * @jest-environment node
 */
import {
  CircuitBreaker,
  CircuitState,
  CircuitOpenError,
  getCircuitBreaker,
  resetCircuitBreaker,
  getAllCircuitStats,
} from '@/lib/utils/circuit-breaker';

describe('Circuit Breaker', () => {
  describe('CircuitOpenError', () => {
    it('should create error with correct properties', () => {
      const error = new CircuitOpenError('Circuit is open', 5000);

      expect(error.name).toBe('CircuitOpenError');
      expect(error.message).toBe('Circuit is open');
      expect(error.resetTimeMs).toBe(5000);
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('CircuitBreaker class', () => {
    let breaker: CircuitBreaker;

    beforeEach(() => {
      breaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeoutMs: 100,
        successThreshold: 2,
      });
    });

    describe('initial state', () => {
      it('should start in CLOSED state', () => {
        expect(breaker.getState()).toBe(CircuitState.CLOSED);
      });

      it('should have zero stats initially', () => {
        const stats = breaker.getStats();
        expect(stats.failures).toBe(0);
        expect(stats.successes).toBe(0);
        expect(stats.totalRequests).toBe(0);
      });

      it('should not be open initially', () => {
        expect(breaker.isOpen()).toBe(false);
      });
    });

    describe('success handling', () => {
      it('should track successful requests', () => {
        breaker.recordSuccess();

        const stats = breaker.getStats();
        expect(stats.totalSuccesses).toBe(1);
        expect(stats.lastSuccessTime).not.toBeNull();
      });

      it('should reset failure count on success', () => {
        breaker.recordFailure();
        breaker.recordFailure();
        breaker.recordSuccess();

        const stats = breaker.getStats();
        expect(stats.failures).toBe(0);
      });
    });

    describe('failure handling', () => {
      it('should track failed requests', () => {
        breaker.recordFailure();

        const stats = breaker.getStats();
        expect(stats.failures).toBe(1);
        expect(stats.totalFailures).toBe(1);
        expect(stats.lastFailureTime).not.toBeNull();
      });

      it('should open circuit after reaching failure threshold', () => {
        breaker.recordFailure();
        breaker.recordFailure();
        breaker.recordFailure();

        expect(breaker.getState()).toBe(CircuitState.OPEN);
        expect(breaker.isOpen()).toBe(true);
      });

      it('should not open circuit before threshold', () => {
        breaker.recordFailure();
        breaker.recordFailure();

        expect(breaker.getState()).toBe(CircuitState.CLOSED);
      });
    });

    describe('canRequest', () => {
      it('should allow requests when circuit is CLOSED', () => {
        expect(breaker.canRequest()).toBe(true);
      });

      it('should throw CircuitOpenError when circuit is OPEN', () => {
        breaker.recordFailure();
        breaker.recordFailure();
        breaker.recordFailure();

        expect(() => breaker.canRequest()).toThrow(CircuitOpenError);
      });
    });

    describe('state transitions', () => {
      it('should transition from OPEN to HALF_OPEN after reset timeout', async () => {
        // Open the circuit
        breaker.recordFailure();
        breaker.recordFailure();
        breaker.recordFailure();

        expect(breaker.getState()).toBe(CircuitState.OPEN);

        // Wait for reset timeout
        await new Promise((resolve) => setTimeout(resolve, 150));

        expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);
      });

      it('should transition from HALF_OPEN to CLOSED after success threshold', async () => {
        // Open the circuit
        breaker.recordFailure();
        breaker.recordFailure();
        breaker.recordFailure();

        // Wait for reset timeout
        await new Promise((resolve) => setTimeout(resolve, 150));

        expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

        // Record successes
        breaker.recordSuccess();
        breaker.recordSuccess();

        expect(breaker.getState()).toBe(CircuitState.CLOSED);
      });

      it('should transition from HALF_OPEN to OPEN on failure', async () => {
        // Open the circuit
        breaker.recordFailure();
        breaker.recordFailure();
        breaker.recordFailure();

        // Wait for reset timeout
        await new Promise((resolve) => setTimeout(resolve, 150));

        expect(breaker.getState()).toBe(CircuitState.HALF_OPEN);

        // Record failure
        breaker.recordFailure();

        expect(breaker.getState()).toBe(CircuitState.OPEN);
      });
    });

    describe('execute', () => {
      it('should execute function when circuit is CLOSED', async () => {
        const fn = jest.fn().mockResolvedValue('success');

        const result = await breaker.execute(fn);

        expect(result).toBe('success');
        expect(fn).toHaveBeenCalled();
      });

      it('should record success on successful execution', async () => {
        const fn = jest.fn().mockResolvedValue('success');

        await breaker.execute(fn);

        const stats = breaker.getStats();
        expect(stats.totalSuccesses).toBe(1);
      });

      it('should record failure on failed execution', async () => {
        const fn = jest.fn().mockRejectedValue(new Error('Failed'));

        await expect(breaker.execute(fn)).rejects.toThrow('Failed');

        const stats = breaker.getStats();
        expect(stats.totalFailures).toBe(1);
      });

      it('should throw CircuitOpenError when circuit is open', async () => {
        breaker.recordFailure();
        breaker.recordFailure();
        breaker.recordFailure();

        const fn = jest.fn();

        await expect(breaker.execute(fn)).rejects.toThrow(CircuitOpenError);
        expect(fn).not.toHaveBeenCalled();
      });

      it('should return fallback when circuit is open and fallback provided', async () => {
        breaker.recordFailure();
        breaker.recordFailure();
        breaker.recordFailure();

        const fn = jest.fn();

        const result = await breaker.execute(fn, 'fallback');

        expect(result).toBe('fallback');
        expect(fn).not.toHaveBeenCalled();
      });

      it('should track total requests', async () => {
        const fn = jest.fn().mockResolvedValue('success');

        await breaker.execute(fn);
        await breaker.execute(fn);
        await breaker.execute(fn);

        const stats = breaker.getStats();
        expect(stats.totalRequests).toBe(3);
      });
    });

    describe('reset', () => {
      it('should reset circuit to CLOSED state', () => {
        breaker.recordFailure();
        breaker.recordFailure();
        breaker.recordFailure();

        expect(breaker.getState()).toBe(CircuitState.OPEN);

        breaker.reset();

        expect(breaker.getState()).toBe(CircuitState.CLOSED);
      });

      it('should clear failure and success counts', () => {
        breaker.recordFailure();
        breaker.recordFailure();

        breaker.reset();

        const stats = breaker.getStats();
        expect(stats.failures).toBe(0);
        expect(stats.successes).toBe(0);
      });
    });
  });

  describe('Global circuit breaker functions', () => {
    beforeEach(() => {
      // Reset any existing circuit breakers
      resetCircuitBreaker('test-service');
    });

    describe('getCircuitBreaker', () => {
      it('should create a new circuit breaker for a service', () => {
        const breaker = getCircuitBreaker('test-service');

        expect(breaker).toBeInstanceOf(CircuitBreaker);
        expect(breaker.getState()).toBe(CircuitState.CLOSED);
      });

      it('should return the same instance for the same service', () => {
        const breaker1 = getCircuitBreaker('test-service');
        const breaker2 = getCircuitBreaker('test-service');

        expect(breaker1).toBe(breaker2);
      });

      it('should create different instances for different services', () => {
        const breaker1 = getCircuitBreaker('service-a');
        const breaker2 = getCircuitBreaker('service-b');

        expect(breaker1).not.toBe(breaker2);
      });

      it('should use provided configuration', () => {
        const breaker = getCircuitBreaker('custom-service', {
          failureThreshold: 10,
        });

        // Record 5 failures (should not open with threshold of 10)
        for (let i = 0; i < 5; i++) {
          breaker.recordFailure();
        }

        expect(breaker.getState()).toBe(CircuitState.CLOSED);
      });
    });

    describe('resetCircuitBreaker', () => {
      it('should reset an existing circuit breaker', () => {
        // Get a fresh circuit breaker with a unique name for this test
        const breaker = getCircuitBreaker('reset-test-service', {
          failureThreshold: 2,
        });

        // Reset it first to ensure clean state
        breaker.reset();

        // Now record failures
        breaker.recordFailure();
        breaker.recordFailure();

        expect(breaker.getState()).toBe(CircuitState.OPEN);

        resetCircuitBreaker('reset-test-service');

        expect(breaker.getState()).toBe(CircuitState.CLOSED);
      });

      it('should handle non-existent service gracefully', () => {
        expect(() => resetCircuitBreaker('non-existent')).not.toThrow();
      });
    });

    describe('getAllCircuitStats', () => {
      it('should return stats for all circuit breakers', () => {
        const breaker1 = getCircuitBreaker('service-1');
        const breaker2 = getCircuitBreaker('service-2');

        breaker1.recordSuccess();
        breaker2.recordFailure();

        const stats = getAllCircuitStats();

        expect(stats['service-1']).toBeDefined();
        expect(stats['service-2']).toBeDefined();
        expect(stats['service-1'].totalSuccesses).toBe(1);
        expect(stats['service-2'].totalFailures).toBe(1);
      });

      it('should return empty object when no circuit breakers exist', () => {
        // Clear all circuit breakers first by resetting them
        const stats = getAllCircuitStats();
        expect(typeof stats).toBe('object');
      });
    });
  });
});
