/**
 * Reliability tests for error handling.
 */

import { validateEmail } from '@/lib/validators';
import { clearAllCaches } from '@/lib/cache';

describe('Reliability Tests', () => {
  beforeEach(() => {
    clearAllCaches();
  });

  describe('Input resilience', () => {
    test('handles empty string', async () => {
      const result = await validateEmail('');

      expect(result.isValid).toBe(false);
      expect(result.checks.syntax.valid).toBe(false);
    });

    test('handles whitespace-only input', async () => {
      const result = await validateEmail('   ');

      expect(result.isValid).toBe(false);
      expect(result.checks.syntax.valid).toBe(false);
    });

    test('handles very long input', async () => {
      const longEmail = 'a'.repeat(300) + '@example.com';
      const result = await validateEmail(longEmail);

      expect(result.isValid).toBe(false);
      expect(result.checks.syntax.valid).toBe(false);
    });

    test('handles standard email format', async () => {
      const result = await validateEmail('testuser@example.com');

      expect(result.checks.syntax.valid).toBe(true);
    });
  });

  describe('Error recovery', () => {
    test('recovers from invalid input', async () => {
      // First, try invalid input
      await validateEmail('invalid');
      await validateEmail('');
      await validateEmail('   ');

      // Then validate a normal email - should still work
      const result = await validateEmail('recovery@example.com');

      expect(result.email).toBe('recovery@example.com');
      expect(result.checks.syntax.valid).toBe(true);
    });
  });

  describe('Concurrent request handling', () => {
    test('handles concurrent requests', async () => {
      const emails = Array.from(
        { length: 10 },
        (_, i) => `concurrent-${i}@example.com`
      );

      const results = await Promise.all(
        emails.map(email => validateEmail(email))
      );

      expect(results).toHaveLength(10);
      results.forEach((result, i) => {
        expect(result.email).toBe(emails[i]);
      });
    });

    test('handles mixed success and failure concurrently', async () => {
      const emails = [
        'valid1@example.com',
        'invalid-syntax',
        'valid2@example.com',
        'another-invalid',
        'valid3@example.com',
      ];

      const results = await Promise.all(
        emails.map(email => validateEmail(email))
      );

      expect(results).toHaveLength(5);

      // Check valid ones have correct syntax
      expect(results[0].checks.syntax.valid).toBe(true);
      expect(results[2].checks.syntax.valid).toBe(true);
      expect(results[4].checks.syntax.valid).toBe(true);

      // Check invalid ones
      expect(results[1].checks.syntax.valid).toBe(false);
      expect(results[3].checks.syntax.valid).toBe(false);
    });
  });

  describe('State consistency', () => {
    test('validation state is independent per request', async () => {
      // Validate disposable email
      const disposable = await validateEmail('test@mailinator.com');
      expect(disposable.checks.disposable.isDisposable).toBe(true);

      // Validate non-disposable email - should not be affected
      const regular = await validateEmail('test@example.com');
      expect(regular.checks.disposable.isDisposable).toBe(false);
    });

    test('cache does not mix up results', async () => {
      const email1 = 'unique-email-1@gmail.com';
      const email2 = 'unique-email-2@yahoo.com';

      const result1 = await validateEmail(email1);
      const result2 = await validateEmail(email2);

      // Verify results match their emails
      expect(result1.email).toBe(email1);
      expect(result2.email).toBe(email2);

      // Different providers should be detected correctly
      expect(result1.checks.freeProvider.provider).toBe('Gmail');
      expect(result2.checks.freeProvider.provider).toBe('Yahoo');
    });
  });

  describe('Graceful degradation', () => {
    test('always returns a valid result structure', async () => {
      const testCases = [
        'valid@example.com',
        'invalid',
        'admin@mailinator.com',
        '',
      ];

      for (const email of testCases) {
        const result = await validateEmail(email);

        // All required fields should exist
        expect(result.email).toBeDefined();
        expect(typeof result.isValid).toBe('boolean');
        expect(typeof result.score).toBe('number');
        expect(result.checks).toBeDefined();
        expect(result.deliverability).toBeDefined();
        expect(result.risk).toBeDefined();
        expect(result.timestamp).toBeDefined();
      }
    });
  });
});
