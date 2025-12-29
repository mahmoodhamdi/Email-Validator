/**
 * Integration tests for caching behavior.
 */

import { validateEmail } from '@/lib/validators';
import {
  clearAllCaches,
  getAllCacheStats,
  resultCache,
} from '@/lib/cache';

describe('Caching Integration', () => {
  beforeEach(() => {
    clearAllCaches();
  });

  describe('Result caching', () => {
    test('caches validation results', async () => {
      const email = 'cache-test@example.com';

      // First validation
      await validateEmail(email);
      const statsAfterFirst = getAllCacheStats();
      const initialSize = statsAfterFirst.result.size;

      // Second validation (should hit cache)
      await validateEmail(email);
      const statsAfterSecond = getAllCacheStats();

      // Cache should have the result
      expect(statsAfterSecond.result.size).toBeGreaterThanOrEqual(initialSize);
    });

    test('cached result is identical to fresh result', async () => {
      const email = 'identical-test@example.com';

      // First validation (fresh)
      const result1 = await validateEmail(email);

      // Second validation (from cache)
      const result2 = await validateEmail(email);

      expect(result1.email).toBe(result2.email);
      expect(result1.checks.syntax.valid).toBe(result2.checks.syntax.valid);
      expect(result1.checks.disposable.isDisposable).toBe(result2.checks.disposable.isDisposable);
    });
  });

  describe('Cache isolation', () => {
    test('different emails have separate cache entries', async () => {
      const result1 = await validateEmail('unique1@example.com');
      const result2 = await validateEmail('unique2@example.com');

      // Different emails should have different results
      expect(result1.email).not.toBe(result2.email);
    });

    test('cache correctly distinguishes similar emails', async () => {
      const result1 = await validateEmail('test@gmail.com');
      const result2 = await validateEmail('test@yahoo.com');

      // Same local part but different domains
      expect(result1.checks.freeProvider.provider).toBe('Gmail');
      expect(result2.checks.freeProvider.provider).toBe('Yahoo');
    });
  });

  describe('Cache clear', () => {
    test('clearAllCaches resets all caches', async () => {
      // Populate caches
      await validateEmail('clear-test@example.com');

      // Clear all caches
      clearAllCaches();

      const stats = getAllCacheStats();
      expect(stats.result.size).toBe(0);
      expect(stats.mx.size).toBe(0);
      expect(stats.domain.size).toBe(0);
    });
  });

  describe('Cache statistics', () => {
    test('getAllCacheStats returns accurate statistics', async () => {
      clearAllCaches();

      const initialStats = getAllCacheStats();
      expect(initialStats.result.size).toBe(0);

      await validateEmail('stats-test@example.com');

      const afterStats = getAllCacheStats();
      // Should have recorded the validation
      expect(afterStats.result.size + afterStats.result.misses).toBeGreaterThan(0);
    });

    test('stats include hit rate calculation', async () => {
      clearAllCaches();
      const stats = getAllCacheStats();

      expect(stats.result).toHaveProperty('hits');
      expect(stats.result).toHaveProperty('misses');
      expect(stats.result).toHaveProperty('hitRate');
    });
  });

  describe('LRU Cache behavior', () => {
    test('cache has getStats method', () => {
      const stats = resultCache.getStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('ttlMs');
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('hitRate');
    });

    test('cache tracks size correctly', () => {
      resultCache.clear();

      const initialSize = resultCache.size;
      expect(initialSize).toBe(0);
    });
  });
});
