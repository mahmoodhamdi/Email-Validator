/**
 * Tests for SMTP Integration in Main Validator
 */

import type { ValidationOptions } from '@/lib/validators';

describe('Validator SMTP Integration', () => {
  describe('validateEmail without SMTP', () => {
    test('does not include smtp in checks by default', async () => {
      const { validateEmail } = await import('@/lib/validators');
      const result = await validateEmail('test@gmail.com');

      expect(result.checks.smtp).toBeUndefined();
    });

    test('does not include smtp when smtpCheck is false', async () => {
      const { validateEmail } = await import('@/lib/validators');
      const result = await validateEmail('test@gmail.com', { smtpCheck: false });

      expect(result.checks.smtp).toBeUndefined();
    });
  });

  describe('checkSMTP function', () => {
    test('returns disabled when SMTP check is disabled', async () => {
      const { checkSMTP } = await import('@/lib/validators/smtp');
      const result = await checkSMTP('test@example.com', ['mx.example.com'], {
        enabled: false,
      });

      expect(result.checked).toBe(false);
      expect(result.message).toBe('SMTP verification disabled');
    });

    test('returns error when no MX records provided', async () => {
      const { checkSMTP } = await import('@/lib/validators/smtp');
      const result = await checkSMTP('test@example.com', [], {
        enabled: true,
      });

      expect(result.checked).toBe(false);
      expect(result.message).toBe('No MX records available');
    });
  });

  describe('ValidationOptions type', () => {
    test('accepts smtpCheck option', async () => {
      const { validateEmail } = await import('@/lib/validators');
      const options: ValidationOptions = {
        smtpCheck: false, // Use false to avoid actual SMTP connection
      };

      // Should not throw
      const result = await validateEmail('test@gmail.com', options);
      expect(result).toBeDefined();
    });

    test('accepts smtpTimeout option', async () => {
      const { validateEmail } = await import('@/lib/validators');
      const options: ValidationOptions = {
        smtpCheck: false,
        smtpTimeout: 5000,
      };

      // Should not throw
      const result = await validateEmail('test@gmail.com', options);
      expect(result).toBeDefined();
    });
  });

  describe('SMTP result structure', () => {
    test('SMTPCheckResult has correct fields', async () => {
      const { checkSMTP } = await import('@/lib/validators/smtp');
      const result = await checkSMTP('test@example.com', ['mx.example.com'], {
        enabled: false,
      });

      expect(result).toHaveProperty('checked');
      expect(result).toHaveProperty('exists');
      expect(result).toHaveProperty('catchAll');
      expect(result).toHaveProperty('greylisted');
      expect(result).toHaveProperty('message');
    });

    test('exists is null when check not performed', async () => {
      const { checkSMTP } = await import('@/lib/validators/smtp');
      const result = await checkSMTP('test@example.com', ['mx.example.com'], {
        enabled: false,
      });

      expect(result.exists).toBeNull();
    });
  });
});
