/**
 * Tests for the email validator module
 */

import { validateEmail, ValidationResult } from '../validator';

describe('validateEmail', () => {
  describe('syntax validation', () => {
    test('validates correct email format', async () => {
      const result = await validateEmail('test@example.com');
      expect(result.checks.syntax.valid).toBe(true);
    });

    test('rejects email without @', async () => {
      const result = await validateEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.checks.syntax.valid).toBe(false);
      expect(result.checks.syntax.message).toContain('@');
    });

    test('rejects empty email', async () => {
      const result = await validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.checks.syntax.valid).toBe(false);
    });

    test('rejects email with spaces', async () => {
      const result = await validateEmail('test @example.com');
      expect(result.isValid).toBe(false);
    });

    test('rejects email with local part > 64 chars', async () => {
      const longLocal = 'a'.repeat(65);
      const result = await validateEmail(`${longLocal}@example.com`);
      expect(result.checks.syntax.valid).toBe(false);
      expect(result.checks.syntax.message).toContain('64');
    });
  });

  describe('disposable email detection', () => {
    test('detects disposable email domains', async () => {
      const result = await validateEmail('test@mailinator.com');
      expect(result.checks.disposable.isDisposable).toBe(true);
    });

    test('allows non-disposable domains', async () => {
      const result = await validateEmail('test@gmail.com');
      expect(result.checks.disposable.isDisposable).toBe(false);
    });
  });

  describe('free provider detection', () => {
    test('detects Gmail as free provider', async () => {
      const result = await validateEmail('test@gmail.com');
      expect(result.checks.freeProvider.isFree).toBe(true);
      expect(result.checks.freeProvider.provider).toBe('Gmail');
    });

    test('detects Yahoo as free provider', async () => {
      const result = await validateEmail('test@yahoo.com');
      expect(result.checks.freeProvider.isFree).toBe(true);
      expect(result.checks.freeProvider.provider).toBe('Yahoo');
    });

    test('detects non-free provider', async () => {
      const result = await validateEmail('test@company.com');
      expect(result.checks.freeProvider.isFree).toBe(false);
      expect(result.checks.freeProvider.provider).toBeNull();
    });
  });

  describe('role-based email detection', () => {
    test('detects admin@ as role-based', async () => {
      const result = await validateEmail('admin@example.com');
      expect(result.checks.roleBased.isRoleBased).toBe(true);
      expect(result.checks.roleBased.role).toBe('admin');
    });

    test('detects support@ as role-based', async () => {
      const result = await validateEmail('support@example.com');
      expect(result.checks.roleBased.isRoleBased).toBe(true);
      expect(result.checks.roleBased.role).toBe('support');
    });

    test('detects info@ as role-based', async () => {
      const result = await validateEmail('info@example.com');
      expect(result.checks.roleBased.isRoleBased).toBe(true);
    });

    test('does not flag personal email as role-based', async () => {
      const result = await validateEmail('john@example.com');
      expect(result.checks.roleBased.isRoleBased).toBe(false);
    });
  });

  describe('typo detection', () => {
    test('detects gmial.com typo', async () => {
      const result = await validateEmail('test@gmial.com');
      expect(result.checks.typo.hasTypo).toBe(true);
      expect(result.checks.typo.suggestion).toBe('gmail.com');
    });

    test('detects gmal.com typo', async () => {
      const result = await validateEmail('test@gmal.com');
      expect(result.checks.typo.hasTypo).toBe(true);
      expect(result.checks.typo.suggestion).toBe('gmail.com');
    });

    test('does not flag correct domain', async () => {
      const result = await validateEmail('test@gmail.com');
      expect(result.checks.typo.hasTypo).toBe(false);
    });
  });

  describe('scoring', () => {
    test('valid email gets high score', async () => {
      const result = await validateEmail('test@gmail.com');
      expect(result.score).toBeGreaterThanOrEqual(70);
    });

    test('invalid syntax gets score 0', async () => {
      const result = await validateEmail('invalid-email');
      expect(result.score).toBe(0);
    });

    test('disposable email gets lower score', async () => {
      const normalResult = await validateEmail('test@gmail.com');
      const disposableResult = await validateEmail('test@mailinator.com');
      expect(disposableResult.score).toBeLessThan(normalResult.score);
    });
  });

  describe('deliverability', () => {
    test('invalid syntax returns undeliverable', async () => {
      const result = await validateEmail('invalid');
      expect(result.deliverability).toBe('undeliverable');
    });
  });

  describe('risk assessment', () => {
    test('invalid email has high risk', async () => {
      const result = await validateEmail('invalid');
      expect(result.risk).toBe('high');
    });

    test('email with typo has high risk', async () => {
      const result = await validateEmail('test@gmial.com');
      expect(result.risk).toBe('high');
    });
  });

  describe('result structure', () => {
    test('returns complete result structure', async () => {
      const result = await validateEmail('test@example.com');

      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('deliverability');
      expect(result).toHaveProperty('risk');
      expect(result).toHaveProperty('checks');
      expect(result).toHaveProperty('timestamp');

      expect(result.checks).toHaveProperty('syntax');
      expect(result.checks).toHaveProperty('domain');
      expect(result.checks).toHaveProperty('mx');
      expect(result.checks).toHaveProperty('disposable');
      expect(result.checks).toHaveProperty('roleBased');
      expect(result.checks).toHaveProperty('freeProvider');
      expect(result.checks).toHaveProperty('typo');
    });

    test('timestamp is valid ISO string', async () => {
      const result = await validateEmail('test@example.com');
      expect(() => new Date(result.timestamp)).not.toThrow();
    });
  });
});
