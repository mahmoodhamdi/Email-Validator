/**
 * Performance tests for the LRU cache implementation.
 */

import { LRUCache, mxCache, domainCache, resultCache } from '@/lib/cache';

describe('LRUCache', () => {
  describe('basic operations', () => {
    it('should store and retrieve values', () => {
      const cache = new LRUCache<string>(100, 60000);
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });

    it('should return null for missing keys', () => {
      const cache = new LRUCache<string>(100, 60000);
      expect(cache.get('nonexistent')).toBeNull();
    });

    it('should check if key exists', () => {
      const cache = new LRUCache<string>(100, 60000);
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });

    it('should delete keys', () => {
      const cache = new LRUCache<string>(100, 60000);
      cache.set('key1', 'value1');
      cache.delete('key1');
      expect(cache.get('key1')).toBeNull();
    });

    it('should clear all entries', () => {
      const cache = new LRUCache<string>(100, 60000);
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.clear();
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBeNull();
      expect(cache.size).toBe(0);
    });
  });

  describe('LRU eviction', () => {
    it('should evict oldest entry when max size is reached', () => {
      const cache = new LRUCache<string>(3, 60000);
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      cache.set('key4', 'value4'); // Should evict key1

      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });

    it('should update access order on get', async () => {
      const cache = new LRUCache<string>(3, 60000);
      cache.set('key1', 'value1');
      await new Promise((r) => setTimeout(r, 5));
      cache.set('key2', 'value2');
      await new Promise((r) => setTimeout(r, 5));
      cache.set('key3', 'value3');
      await new Promise((r) => setTimeout(r, 5));

      // Access key1, making it recently used
      cache.get('key1');
      await new Promise((r) => setTimeout(r, 5));

      // Add new key, should evict key2 (oldest accessed)
      cache.set('key4', 'value4');

      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBeNull();
      expect(cache.get('key3')).toBe('value3');
      expect(cache.get('key4')).toBe('value4');
    });

    it('should update access order on set (update existing)', () => {
      const cache = new LRUCache<string>(3, 60000);
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');

      // Update key1, making it recently used
      cache.set('key1', 'updated');

      // Add new key, should evict key2 (oldest accessed)
      cache.set('key4', 'value4');

      expect(cache.get('key1')).toBe('updated');
      expect(cache.get('key2')).toBeNull();
    });
  });

  describe('TTL expiration', () => {
    it('should expire entries after TTL', async () => {
      const cache = new LRUCache<string>(100, 50); // 50ms TTL
      cache.set('key1', 'value1');

      expect(cache.get('key1')).toBe('value1');

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(cache.get('key1')).toBeNull();
    });

    it('should support custom TTL per entry', async () => {
      const cache = new LRUCache<string>(100, 1000); // Default 1s TTL
      cache.set('key1', 'value1', 50); // Custom 50ms TTL

      expect(cache.get('key1')).toBe('value1');

      // Wait for custom TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(cache.get('key1')).toBeNull();
    });

    it('should not return expired entries on has()', async () => {
      const cache = new LRUCache<string>(100, 50);
      cache.set('key1', 'value1');

      expect(cache.has('key1')).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 60));

      expect(cache.has('key1')).toBe(false);
    });
  });

  describe('statistics', () => {
    it('should track cache size', () => {
      const cache = new LRUCache<string>(100, 60000);
      expect(cache.size).toBe(0);

      cache.set('key1', 'value1');
      expect(cache.size).toBe(1);

      cache.set('key2', 'value2');
      expect(cache.size).toBe(2);

      cache.delete('key1');
      expect(cache.size).toBe(1);
    });

    it('should track hit/miss statistics', () => {
      const cache = new LRUCache<string>(100, 60000);
      cache.set('key1', 'value1');

      cache.get('key1'); // Hit
      cache.get('key1'); // Hit
      cache.get('key2'); // Miss

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
    });

    it('should return 0 hit rate when no requests', () => {
      const cache = new LRUCache<string>(100, 60000);
      const stats = cache.getStats();
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('performance', () => {
    it('should handle large number of entries efficiently', () => {
      const cache = new LRUCache<number>(10000, 60000);
      const start = performance.now();

      // Insert 10000 entries
      for (let i = 0; i < 10000; i++) {
        cache.set(`key${i}`, i);
      }

      // Read 10000 entries
      for (let i = 0; i < 10000; i++) {
        cache.get(`key${i}`);
      }

      const duration = performance.now() - start;

      // Should complete in under 2000ms (generous threshold for CI/slow systems)
      expect(duration).toBeLessThan(2000);
    });

    it('should handle rapid set/get operations', () => {
      const cache = new LRUCache<string>(1000, 60000);
      const start = performance.now();

      for (let i = 0; i < 5000; i++) {
        const key = `key${i % 100}`; // Reuse keys
        cache.set(key, `value${i}`);
        cache.get(key);
      }

      const duration = performance.now() - start;

      // Should complete in under 100ms
      expect(duration).toBeLessThan(100);
    });
  });
});

describe('Pre-configured caches', () => {
  beforeEach(() => {
    mxCache.clear();
    domainCache.clear();
    resultCache.clear();
  });

  describe('mxCache', () => {
    it('should be configured for MX records', () => {
      const testResult = {
        valid: true,
        records: ['mx1.example.com', 'mx2.example.com'],
        message: 'Found 2 MX record(s)',
      };

      mxCache.set('example.com', testResult);
      expect(mxCache.get('example.com')).toEqual(testResult);
    });
  });

  describe('domainCache', () => {
    it('should be configured for domain validation', () => {
      const testResult = {
        valid: true,
        exists: true,
        message: 'Domain is valid',
      };

      domainCache.set('example.com', testResult);
      expect(domainCache.get('example.com')).toEqual(testResult);
    });
  });

  describe('resultCache', () => {
    it('should be configured for validation results', () => {
      const testResult = {
        email: 'test@example.com',
        isValid: true,
        score: 85,
        checks: {} as never,
        deliverability: 'deliverable' as const,
        risk: 'low' as const,
        timestamp: new Date().toISOString(),
      };

      resultCache.set('test@example.com', testResult);
      expect(resultCache.get('test@example.com')).toEqual(testResult);
    });
  });
});
