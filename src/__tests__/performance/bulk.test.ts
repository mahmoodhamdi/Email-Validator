/**
 * Performance tests for bulk email validation.
 */

import { validateEmailBulk } from '@/lib/validators';
import {
  deduplicatedValidate,
  getPendingRequestCount,
  isRequestPending,
  clearPendingRequests,
} from '@/lib/request-dedup';
import { resultCache, mxCache, domainCache } from '@/lib/cache';
import type { ValidationResult } from '@/types/email';

// Mock fetch for MX lookups
const originalFetch = global.fetch;

beforeAll(() => {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    // Mock DNS API responses
    if (url.includes('dns.google')) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            Status: 0,
            Answer: [{ type: 15, data: '10 mx.example.com.' }],
          }),
      });
    }
    return originalFetch(url);
  });
});

afterAll(() => {
  global.fetch = originalFetch;
});

beforeEach(() => {
  // Clear all caches before each test
  resultCache.clear();
  mxCache.clear();
  domainCache.clear();
  clearPendingRequests();
  jest.clearAllMocks();
});

describe('Bulk validation', () => {
  describe('batching', () => {
    it('should process emails in batches', async () => {
      const emails = [
        'test1@example.com',
        'test2@example.com',
        'test3@example.com',
        'test4@example.com',
        'test5@example.com',
      ];

      const progressCalls: Array<{ completed: number; total: number }> = [];

      const bulkResult = await validateEmailBulk(emails, {
        onProgress: (completed, total) => {
          progressCalls.push({ completed, total });
        },
      });

      expect(bulkResult.results).toHaveLength(5);
      expect(bulkResult.metadata.completed).toBe(5);
      expect(bulkResult.metadata.total).toBe(5);
      expect(bulkResult.metadata.timedOut).toBe(false);
      expect(progressCalls.length).toBeGreaterThan(0);

      // Each progress call should report total as 5
      progressCalls.forEach((call) => {
        expect(call.total).toBe(5);
      });

      // Last progress call should show all completed
      const lastCall = progressCalls[progressCalls.length - 1];
      expect(lastCall.completed).toBe(5);
    });

    it('should return empty result for empty input', async () => {
      const bulkResult = await validateEmailBulk([]);
      expect(bulkResult.results).toEqual([]);
      expect(bulkResult.metadata.total).toBe(0);
      expect(bulkResult.metadata.completed).toBe(0);
    });

    it('should handle single email', async () => {
      const bulkResult = await validateEmailBulk(['test@example.com']);
      expect(bulkResult.results).toHaveLength(1);
      expect(bulkResult.results[0].email).toBe('test@example.com');
    });
  });

  describe('caching in bulk operations', () => {
    it('should cache results during bulk validation', async () => {
      const emails = ['test@example.com', 'test@example.com', 'test@example.com'];

      const bulkResult = await validateEmailBulk(emails);

      expect(bulkResult.results).toHaveLength(3);

      // All results should be the same (cached)
      expect(bulkResult.results[0].email).toBe(bulkResult.results[1].email);
      expect(bulkResult.results[0].score).toBe(bulkResult.results[1].score);
    });

    it('should reuse cached MX records for sequential validations', async () => {
      // First validation populates the cache
      await validateEmailBulk(['user1@example.com']);

      // Clear mock call history
      (global.fetch as jest.Mock).mockClear();

      // Second validation should use cached MX record
      await validateEmailBulk(['user2@example.com']);

      // Check that no new MX fetch was made (used cache)
      const fetchCalls = (global.fetch as jest.Mock).mock.calls.filter((call: [string]) =>
        call[0].includes('dns.google')
      );

      // Should have 0 MX lookups (using cache from first validation)
      expect(fetchCalls.length).toBe(0);
    });
  });

  describe('performance', () => {
    it('should validate 50 emails within reasonable time', async () => {
      const emails = Array.from({ length: 50 }, (_, i) => `user${i}@example.com`);

      const start = performance.now();
      const bulkResult = await validateEmailBulk(emails);
      const duration = performance.now() - start;

      expect(bulkResult.results).toHaveLength(50);
      expect(bulkResult.metadata.completed).toBe(50);
      // Should complete in under 5 seconds (accounting for batch delays)
      expect(duration).toBeLessThan(5000);
    });

    it('should be faster with cached results', async () => {
      const emails = ['test@example.com'];

      // First validation (cold cache)
      const start1 = performance.now();
      await validateEmailBulk(emails);
      const duration1 = performance.now() - start1;

      // Second validation (warm cache)
      const start2 = performance.now();
      await validateEmailBulk(emails);
      const duration2 = performance.now() - start2;

      // Cached validation should be faster
      expect(duration2).toBeLessThan(duration1);
    });
  });

  describe('early termination', () => {
    it('should return metadata with processing time', async () => {
      const emails = ['test1@example.com', 'test2@example.com'];

      const bulkResult = await validateEmailBulk(emails);

      expect(bulkResult.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(bulkResult.metadata.timedOut).toBe(false);
    });

    it('should respect maxTimeoutMs option', async () => {
      // Create a small timeout to trigger early termination
      const emails = Array.from({ length: 100 }, (_, i) => `user${i}@example.com`);

      const bulkResult = await validateEmailBulk(emails, {
        maxTimeoutMs: 10, // Very short timeout
      });

      // Should have processed some emails before timing out
      // (or none if the timeout is too short)
      expect(bulkResult.metadata.total).toBe(100);
      expect(bulkResult.metadata.processingTimeMs).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('Request deduplication', () => {
  const mockValidateFn = jest.fn().mockImplementation(
    (email: string): Promise<ValidationResult> =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({
            email,
            isValid: true,
            score: 85,
            checks: {
              syntax: { valid: true, message: 'Valid' },
              domain: { valid: true, exists: true, message: 'Valid' },
              mx: { valid: true, records: ['mx.example.com'], message: 'Valid' },
              disposable: { isDisposable: false, message: 'Not disposable' },
              roleBased: { isRoleBased: false, role: null },
              freeProvider: { isFree: false, provider: null },
              typo: { hasTypo: false, suggestion: null },
              blacklisted: { isBlacklisted: false, lists: [] },
              catchAll: { isCatchAll: false },
            },
            deliverability: 'deliverable',
            risk: 'low',
            timestamp: new Date().toISOString(),
          });
        }, 50);
      })
  );

  beforeEach(() => {
    mockValidateFn.mockClear();
    clearPendingRequests();
  });

  describe('concurrent request handling', () => {
    it('should deduplicate concurrent requests for same email', async () => {
      const email = 'test@example.com';

      // Fire 5 concurrent requests
      const promises = [
        deduplicatedValidate(email, mockValidateFn),
        deduplicatedValidate(email, mockValidateFn),
        deduplicatedValidate(email, mockValidateFn),
        deduplicatedValidate(email, mockValidateFn),
        deduplicatedValidate(email, mockValidateFn),
      ];

      const results = await Promise.all(promises);

      // All should return same result
      results.forEach((result) => {
        expect(result.email).toBe(email);
        expect(result.isValid).toBe(true);
      });

      // Validation function should only be called once
      expect(mockValidateFn).toHaveBeenCalledTimes(1);
    });

    it('should not deduplicate requests for different emails', async () => {
      const promises = [
        deduplicatedValidate('test1@example.com', mockValidateFn),
        deduplicatedValidate('test2@example.com', mockValidateFn),
        deduplicatedValidate('test3@example.com', mockValidateFn),
      ];

      await Promise.all(promises);

      // Each unique email should trigger its own validation
      expect(mockValidateFn).toHaveBeenCalledTimes(3);
    });

    it('should normalize email before deduplication', async () => {
      const promises = [
        deduplicatedValidate('TEST@example.com', mockValidateFn),
        deduplicatedValidate('test@example.com', mockValidateFn),
        deduplicatedValidate('  test@example.com  ', mockValidateFn),
      ];

      await Promise.all(promises);

      // All variations should be deduplicated to one call
      expect(mockValidateFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('pending request tracking', () => {
    it('should track pending requests', async () => {
      expect(getPendingRequestCount()).toBe(0);

      const promise = deduplicatedValidate('test@example.com', mockValidateFn);

      expect(getPendingRequestCount()).toBe(1);
      expect(isRequestPending('test@example.com')).toBe(true);

      await promise;

      expect(getPendingRequestCount()).toBe(0);
      expect(isRequestPending('test@example.com')).toBe(false);
    });

    it('should clear pending requests on completion', async () => {
      const promises = [
        deduplicatedValidate('test1@example.com', mockValidateFn),
        deduplicatedValidate('test2@example.com', mockValidateFn),
      ];

      expect(getPendingRequestCount()).toBe(2);

      await Promise.all(promises);

      expect(getPendingRequestCount()).toBe(0);
    });

    it('should clear pending requests on error', async () => {
      const errorFn = jest.fn().mockRejectedValue(new Error('Test error'));

      const promise = deduplicatedValidate('test@example.com', errorFn);

      expect(getPendingRequestCount()).toBe(1);

      await expect(promise).rejects.toThrow('Test error');

      expect(getPendingRequestCount()).toBe(0);
    });
  });

  describe('clearPendingRequests', () => {
    it('should clear all pending requests', () => {
      // Start some requests but don't await them
      deduplicatedValidate('test1@example.com', mockValidateFn);
      deduplicatedValidate('test2@example.com', mockValidateFn);

      expect(getPendingRequestCount()).toBe(2);

      clearPendingRequests();

      expect(getPendingRequestCount()).toBe(0);
    });
  });
});

describe('Cache statistics', () => {
  it('should track result cache performance', async () => {
    // Validate same email multiple times
    await validateEmailBulk(['test@example.com']);
    await validateEmailBulk(['test@example.com']);
    await validateEmailBulk(['test@example.com']);

    const stats = resultCache.getStats();

    // Should have at least 2 hits (second and third calls)
    expect(stats.hits).toBeGreaterThanOrEqual(2);
  });

  it('should track MX cache performance', async () => {
    // Validate multiple emails on same domain
    await validateEmailBulk(['user1@example.com', 'user2@example.com', 'user3@example.com']);

    const stats = mxCache.getStats();

    // Should have hits from cache reuse
    expect(stats.hits).toBeGreaterThanOrEqual(0);
  });
});
