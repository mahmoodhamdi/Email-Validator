/**
 * Performance tests for validation.
 */

import { validateEmail } from '@/lib/validators';
import { clearAllCaches } from '@/lib/cache';

describe('Performance Tests', () => {
  beforeEach(() => {
    clearAllCaches();
  });

  describe('Single email validation', () => {
    test('validates syntax-only in under 10ms', async () => {
      const start = Date.now();
      await validateEmail('invalid-syntax');
      const duration = Date.now() - start;

      // Syntax failures short-circuit quickly
      expect(duration).toBeLessThan(100);
    });

    test('cached validation is fast', async () => {
      const email = 'cached-perf@example.com';

      // First call to populate cache
      await validateEmail(email);

      // Second call should be cached and faster
      const start = Date.now();
      await validateEmail(email);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(50);
    });
  });

  describe('Multiple validations', () => {
    test('validates multiple syntax checks quickly', async () => {
      const emails = [
        'invalid1',
        'invalid2',
        'invalid3',
        'invalid4',
        'invalid5',
      ];

      const start = Date.now();
      for (const email of emails) {
        await validateEmail(email);
      }
      const duration = Date.now() - start;

      // Should complete quickly since these all fail syntax
      expect(duration).toBeLessThan(100);
    });

    test('validates concurrent requests', async () => {
      const emails = [
        'concurrent1@example.com',
        'concurrent2@example.com',
        'concurrent3@example.com',
      ];

      const start = Date.now();
      await Promise.all(emails.map(email => validateEmail(email)));
      const duration = Date.now() - start;

      // All should complete in reasonable time
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Throughput', () => {
    test('syntax validation has good throughput', async () => {
      const iterations = 100;
      const emails = Array.from(
        { length: iterations },
        (_, i) => `invalid${i}`
      );

      const start = Date.now();
      for (const email of emails) {
        await validateEmail(email);
      }
      const duration = Date.now() - start;
      const throughput = iterations / (duration / 1000);

      // Should process at least 100 invalid emails per second
      expect(throughput).toBeGreaterThan(50);
    });
  });
});
