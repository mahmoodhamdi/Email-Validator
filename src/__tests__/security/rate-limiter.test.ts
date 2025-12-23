import {
  checkRateLimit,
  checkSingleValidationLimit,
  checkBulkValidationLimit,
  getClientIdentifier,
  createRateLimitHeaders,
  resetRateLimit,
  clearAllRateLimits,
} from '@/lib/rate-limiter';
import { RATE_LIMITS } from '@/lib/constants';

describe('Rate Limiter', () => {
  beforeEach(() => {
    // Clear all rate limits before each test
    clearAllRateLimits();
  });

  describe('checkRateLimit', () => {
    test('should allow requests within limit', () => {
      const result = checkRateLimit('test-ip', 5, 60000);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
    });

    test('should block requests exceeding limit', () => {
      const limit = 3;
      const windowMs = 60000;

      // Make requests up to the limit
      for (let i = 0; i < limit; i++) {
        const result = checkRateLimit('test-ip', limit, windowMs);
        expect(result.allowed).toBe(true);
      }

      // Next request should be blocked
      const result = checkRateLimit('test-ip', limit, windowMs);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    test('should track different IPs separately', () => {
      const limit = 2;
      const windowMs = 60000;

      // Exhaust limit for IP 1
      checkRateLimit('ip1', limit, windowMs);
      checkRateLimit('ip1', limit, windowMs);
      const result1 = checkRateLimit('ip1', limit, windowMs);

      expect(result1.allowed).toBe(false);

      // IP 2 should still have quota
      const result2 = checkRateLimit('ip2', limit, windowMs);
      expect(result2.allowed).toBe(true);
    });

    test('should return correct remaining count', () => {
      const limit = 5;
      const windowMs = 60000;

      for (let i = 0; i < limit; i++) {
        const result = checkRateLimit('test-ip', limit, windowMs);
        expect(result.remaining).toBe(limit - 1 - i);
      }
    });
  });

  describe('checkSingleValidationLimit', () => {
    test('should use single validation limits from constants', () => {
      const result = checkSingleValidationLimit('test-ip');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(RATE_LIMITS.singleValidation.max - 1);
    });
  });

  describe('checkBulkValidationLimit', () => {
    test('should use bulk validation limits from constants', () => {
      const result = checkBulkValidationLimit('test-ip');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(RATE_LIMITS.bulkValidation.max - 1);
    });

    test('should track bulk and single separately', () => {
      // Exhaust bulk limit
      for (let i = 0; i < RATE_LIMITS.bulkValidation.max; i++) {
        checkBulkValidationLimit('test-ip');
      }

      // Bulk should be blocked
      const bulkResult = checkBulkValidationLimit('test-ip');
      expect(bulkResult.allowed).toBe(false);

      // Single should still work
      const singleResult = checkSingleValidationLimit('test-ip');
      expect(singleResult.allowed).toBe(true);
    });
  });

  describe('getClientIdentifier', () => {
    // Create a mock request with headers
    function createMockRequest(headers: Record<string, string> = {}): Request {
      return {
        headers: {
          get: (name: string) => headers[name.toLowerCase()] || null,
        },
      } as unknown as Request;
    }

    test('should return x-forwarded-for header if present', () => {
      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1, 10.0.0.1',
      });

      const result = getClientIdentifier(request);
      expect(result).toBe('192.168.1.1');
    });

    test('should return x-real-ip header if x-forwarded-for is not present', () => {
      const request = createMockRequest({
        'x-real-ip': '192.168.1.1',
      });

      const result = getClientIdentifier(request);
      expect(result).toBe('192.168.1.1');
    });

    test('should return unknown if no IP headers present', () => {
      const request = createMockRequest({});

      const result = getClientIdentifier(request);
      expect(result).toBe('unknown');
    });
  });

  describe('createRateLimitHeaders', () => {
    test('should create proper headers', () => {
      const result = {
        allowed: true,
        remaining: 50,
        resetTime: Date.now() + 60000,
      };

      const headers = createRateLimitHeaders(result);

      expect(headers['X-RateLimit-Limit']).toBeDefined();
      expect(headers['X-RateLimit-Remaining']).toBe('50');
      expect(headers['X-RateLimit-Reset']).toBeDefined();
    });

    test('should include Retry-After when rate limited', () => {
      const result = {
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 60000,
        retryAfter: 60,
      };

      const headers = createRateLimitHeaders(result);

      expect(headers['Retry-After']).toBe('60');
    });
  });

  describe('resetRateLimit', () => {
    test('should reset rate limit for specific identifier', () => {
      // Exhaust limit
      for (let i = 0; i <= RATE_LIMITS.singleValidation.max; i++) {
        checkSingleValidationLimit('test-ip');
      }

      // Should be blocked
      let result = checkSingleValidationLimit('test-ip');
      expect(result.allowed).toBe(false);

      // Reset
      resetRateLimit('test-ip');

      // Should be allowed again
      result = checkSingleValidationLimit('test-ip');
      expect(result.allowed).toBe(true);
    });
  });
});
