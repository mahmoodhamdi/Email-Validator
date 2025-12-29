/**
 * @jest-environment node
 */
import {
  checkRateLimit,
  checkSingleValidationLimit,
  checkBulkValidationLimit,
  getClientIdentifier,
  getClientIP,
  createRateLimitHeaders,
  resetRateLimit,
  clearAllRateLimits,
  isTrustedIP,
  shouldBypassRateLimit,
  addTrustedIP,
  removeTrustedIP,
  getRateLimitStats,
} from '@/lib/rate-limiter';
import { RATE_LIMITS } from '@/lib/constants';

describe('Rate Limiter', () => {
  beforeEach(() => {
    // Clear all rate limits before each test
    clearAllRateLimits();
  });

  describe('checkRateLimit - Sliding Window Algorithm', () => {
    test('should allow requests within limit', () => {
      const result = checkRateLimit('test-client', 5, 60000);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.limit).toBe(5);
    });

    test('should block requests exceeding limit', () => {
      const limit = 3;
      const windowMs = 60000;

      // Make requests up to the limit
      for (let i = 0; i < limit; i++) {
        const result = checkRateLimit('test-client', limit, windowMs);
        expect(result.allowed).toBe(true);
      }

      // Next request should be blocked
      const result = checkRateLimit('test-client', limit, windowMs);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeDefined();
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    test('should track different clients separately', () => {
      const limit = 2;
      const windowMs = 60000;

      // Exhaust limit for client 1
      checkRateLimit('client1', limit, windowMs);
      checkRateLimit('client1', limit, windowMs);
      const result1 = checkRateLimit('client1', limit, windowMs);

      expect(result1.allowed).toBe(false);

      // Client 2 should still have quota
      const result2 = checkRateLimit('client2', limit, windowMs);
      expect(result2.allowed).toBe(true);
    });

    test('should return correct remaining count', () => {
      const limit = 5;
      const windowMs = 60000;

      for (let i = 0; i < limit; i++) {
        const result = checkRateLimit('test-client', limit, windowMs);
        expect(result.remaining).toBe(limit - 1 - i);
      }
    });

    test('should include resetTime in result', () => {
      const now = Date.now();
      const windowMs = 60000;
      const result = checkRateLimit('test-client', 5, windowMs);

      expect(result.resetTime).toBeDefined();
      expect(result.resetTime).toBeGreaterThan(now);
      expect(result.resetTime).toBeLessThanOrEqual(now + windowMs + 100); // Small buffer for execution time
    });

    test('should properly slide window for older requests', async () => {
      const limit = 2;
      const windowMs = 100; // Short window for testing

      // Make requests at limit
      checkRateLimit('test-client', limit, windowMs);
      checkRateLimit('test-client', limit, windowMs);

      // Should be blocked
      let result = checkRateLimit('test-client', limit, windowMs);
      expect(result.allowed).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be allowed again (old requests expired)
      result = checkRateLimit('test-client', limit, windowMs);
      expect(result.allowed).toBe(true);
    });
  });

  describe('checkSingleValidationLimit', () => {
    test('should use single validation limits from constants', () => {
      const result = checkSingleValidationLimit('test-client');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(RATE_LIMITS.singleValidation.max - 1);
    });
  });

  describe('checkBulkValidationLimit', () => {
    test('should use bulk validation limits from constants', () => {
      const result = checkBulkValidationLimit('test-client');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(RATE_LIMITS.bulkValidation.max - 1);
    });

    test('should track bulk and single separately', () => {
      // Exhaust bulk limit
      for (let i = 0; i < RATE_LIMITS.bulkValidation.max; i++) {
        checkBulkValidationLimit('test-client');
      }

      // Bulk should be blocked
      const bulkResult = checkBulkValidationLimit('test-client');
      expect(bulkResult.allowed).toBe(false);

      // Single should still work
      const singleResult = checkSingleValidationLimit('test-client');
      expect(singleResult.allowed).toBe(true);
    });
  });

  describe('getClientIP', () => {
    function createMockRequest(headers: Record<string, string> = {}): Request {
      return {
        headers: {
          get: (name: string) => headers[name.toLowerCase()] || null,
        },
        url: 'http://localhost:3000/api/validate',
      } as unknown as Request;
    }

    test('should prefer cf-connecting-ip header (Cloudflare)', () => {
      const request = createMockRequest({
        'cf-connecting-ip': '203.0.113.50',
        'x-forwarded-for': '192.168.1.1',
        'x-real-ip': '10.0.0.1',
      });

      const result = getClientIP(request);
      expect(result).toBe('203.0.113.50');
    });

    test('should use x-real-ip if cf-connecting-ip not present', () => {
      const request = createMockRequest({
        'x-real-ip': '192.168.1.1',
        'x-forwarded-for': '10.0.0.1',
      });

      const result = getClientIP(request);
      expect(result).toBe('192.168.1.1');
    });

    test('should use first IP from x-forwarded-for if valid', () => {
      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1, 10.0.0.1, 172.16.0.1',
      });

      const result = getClientIP(request);
      expect(result).toBe('192.168.1.1');
    });

    test('should return unknown if no valid IP headers', () => {
      const request = createMockRequest({});

      const result = getClientIP(request);
      expect(result).toBe('unknown');
    });

    test('should reject invalid IPv4 addresses', () => {
      const request = createMockRequest({
        'x-real-ip': '999.999.999.999', // Invalid IP
      });

      const result = getClientIP(request);
      expect(result).toBe('unknown');
    });

    test('should accept valid IPv6 addresses', () => {
      const request = createMockRequest({
        'x-real-ip': '2001:0db8:85a3:0000:0000:8a2e:0370:7334',
      });

      const result = getClientIP(request);
      expect(result).toBe('2001:0db8:85a3:0000:0000:8a2e:0370:7334');
    });

    test('should accept ::1 (localhost IPv6)', () => {
      const request = createMockRequest({
        'x-real-ip': '::1',
      });

      const result = getClientIP(request);
      expect(result).toBe('::1');
    });
  });

  describe('getClientIdentifier - Fingerprinting', () => {
    function createMockRequest(headers: Record<string, string> = {}): Request {
      return {
        headers: {
          get: (name: string) => headers[name.toLowerCase()] || null,
        },
        url: 'http://localhost:3000/api/validate',
      } as unknown as Request;
    }

    test('should create fingerprint from IP + User-Agent', () => {
      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      });

      const result = getClientIdentifier(request);

      // Should be IP:hash format
      expect(result).toMatch(/^192\.168\.1\.1:[a-z0-9]+$/);
    });

    test('should produce consistent fingerprints for same request', () => {
      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Test Agent',
      });

      const result1 = getClientIdentifier(request);
      const result2 = getClientIdentifier(request);

      expect(result1).toBe(result2);
    });

    test('should produce different fingerprints for different User-Agents', () => {
      const request1 = createMockRequest({
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Chrome/120',
      });
      const request2 = createMockRequest({
        'x-forwarded-for': '192.168.1.1',
        'user-agent': 'Firefox/121',
      });

      const result1 = getClientIdentifier(request1);
      const result2 = getClientIdentifier(request2);

      expect(result1).not.toBe(result2);
    });

    test('should create fallback fingerprint when no IP available', () => {
      const request = createMockRequest({
        'user-agent': 'Test Agent',
        'accept-language': 'en-US',
        'accept-encoding': 'gzip, deflate',
      });

      const result = getClientIdentifier(request);

      // Should use fp: prefix for fingerprint-only identification
      expect(result).toMatch(/^fp:[a-z0-9]+$/);
    });
  });

  describe('isTrustedIP', () => {
    beforeEach(() => {
      // Reset trusted IPs to default (from env)
    });

    test('should return false for regular IPs by default', () => {
      expect(isTrustedIP('192.168.1.1')).toBe(false);
      expect(isTrustedIP('10.0.0.1')).toBe(false);
    });

    test('should return true for dynamically added trusted IPs', () => {
      addTrustedIP('192.168.1.100');
      expect(isTrustedIP('192.168.1.100')).toBe(true);

      // Clean up
      removeTrustedIP('192.168.1.100');
    });

    test('should allow removing trusted IPs', () => {
      addTrustedIP('192.168.1.100');
      expect(isTrustedIP('192.168.1.100')).toBe(true);

      removeTrustedIP('192.168.1.100');
      expect(isTrustedIP('192.168.1.100')).toBe(false);
    });
  });

  describe('shouldBypassRateLimit', () => {
    function createMockRequest(headers: Record<string, string> = {}): Request {
      return {
        headers: {
          get: (name: string) => headers[name.toLowerCase()] || null,
        },
        url: 'http://localhost:3000/api/validate',
      } as unknown as Request;
    }

    test('should return true for trusted IPs', () => {
      addTrustedIP('10.0.0.50');

      const request = createMockRequest({
        'x-real-ip': '10.0.0.50',
      });

      const result = shouldBypassRateLimit(request);
      expect(result).toBe(true);

      // Clean up
      removeTrustedIP('10.0.0.50');
    });

    test('should return false for non-trusted IPs', () => {
      const request = createMockRequest({
        'x-real-ip': '192.168.1.1',
      });

      const result = shouldBypassRateLimit(request);
      expect(result).toBe(false);
    });
  });

  describe('createRateLimitHeaders', () => {
    test('should create proper headers for allowed request', () => {
      const result = {
        allowed: true,
        remaining: 50,
        limit: 100,
        resetTime: Date.now() + 60000,
      };

      const headers = createRateLimitHeaders(result);

      expect(headers['X-RateLimit-Limit']).toBe('100');
      expect(headers['X-RateLimit-Remaining']).toBe('50');
      expect(headers['X-RateLimit-Reset']).toBeDefined();
      expect(headers['Retry-After']).toBeUndefined();
    });

    test('should include Retry-After when rate limited', () => {
      const result = {
        allowed: false,
        remaining: 0,
        limit: 100,
        resetTime: Date.now() + 60000,
        retryAfter: 60,
      };

      const headers = createRateLimitHeaders(result);

      expect(headers['Retry-After']).toBe('60');
    });

    test('should allow overriding limit in headers', () => {
      const result = {
        allowed: true,
        remaining: 50,
        limit: 100,
        resetTime: Date.now() + 60000,
      };

      const headers = createRateLimitHeaders(result, 200);

      expect(headers['X-RateLimit-Limit']).toBe('200');
    });

    test('should clamp negative remaining to 0', () => {
      const result = {
        allowed: false,
        remaining: -5,
        limit: 100,
        resetTime: Date.now() + 60000,
      };

      const headers = createRateLimitHeaders(result);

      expect(headers['X-RateLimit-Remaining']).toBe('0');
    });
  });

  describe('resetRateLimit', () => {
    test('should reset rate limit for specific identifier', () => {
      // Exhaust limit
      for (let i = 0; i <= RATE_LIMITS.singleValidation.max; i++) {
        checkSingleValidationLimit('test-client');
      }

      // Should be blocked
      let result = checkSingleValidationLimit('test-client');
      expect(result.allowed).toBe(false);

      // Reset
      resetRateLimit('test-client');

      // Should be allowed again
      result = checkSingleValidationLimit('test-client');
      expect(result.allowed).toBe(true);
    });

    test('should reset both single and bulk limits', () => {
      // Exhaust both limits
      for (let i = 0; i <= RATE_LIMITS.singleValidation.max; i++) {
        checkSingleValidationLimit('test-client');
      }
      for (let i = 0; i <= RATE_LIMITS.bulkValidation.max; i++) {
        checkBulkValidationLimit('test-client');
      }

      // Both should be blocked
      expect(checkSingleValidationLimit('test-client').allowed).toBe(false);
      expect(checkBulkValidationLimit('test-client').allowed).toBe(false);

      // Reset
      resetRateLimit('test-client');

      // Both should be allowed
      expect(checkSingleValidationLimit('test-client').allowed).toBe(true);
      expect(checkBulkValidationLimit('test-client').allowed).toBe(true);
    });
  });

  describe('clearAllRateLimits', () => {
    test('should clear all rate limits', () => {
      // Create entries for multiple clients
      checkRateLimit('client1', 1, 60000);
      checkRateLimit('client2', 1, 60000);
      checkRateLimit('client3', 1, 60000);

      const statsBefore = getRateLimitStats();
      expect(statsBefore.totalEntries).toBeGreaterThan(0);

      clearAllRateLimits();

      const statsAfter = getRateLimitStats();
      expect(statsAfter.totalEntries).toBe(0);
    });
  });

  describe('getRateLimitStats', () => {
    test('should return correct stats', () => {
      clearAllRateLimits();

      // Create some entries
      checkRateLimit('client1', 5, 60000);
      checkRateLimit('client1', 5, 60000);
      checkRateLimit('client2', 5, 60000);

      const stats = getRateLimitStats();

      expect(stats.totalEntries).toBe(2);
      expect(stats.entries).toHaveLength(2);

      const client1Entry = stats.entries.find(e => e.key === 'client1');
      expect(client1Entry?.requestCount).toBe(2);

      const client2Entry = stats.entries.find(e => e.key === 'client2');
      expect(client2Entry?.requestCount).toBe(1);
    });
  });
});
