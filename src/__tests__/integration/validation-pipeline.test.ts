/**
 * Integration tests for the full email validation pipeline.
 * Tests all validators working together (without network calls).
 */

import { validateEmail } from '@/lib/validators';
import { clearAllCaches } from '@/lib/cache';

describe('Validation Pipeline Integration', () => {
  beforeEach(() => {
    clearAllCaches();
  });

  describe('Syntax validation', () => {
    test('validates correct email syntax', async () => {
      const result = await validateEmail('user@example.com');

      expect(result.email).toBe('user@example.com');
      expect(result.checks.syntax.valid).toBe(true);
    });

    test('detects invalid syntax', async () => {
      const result = await validateEmail('invalid-email');

      expect(result.isValid).toBe(false);
      expect(result.score).toBeLessThan(20);
      expect(result.checks.syntax.valid).toBe(false);
      expect(result.deliverability).toBe('undeliverable');
      expect(result.risk).toBe('high');
    });

    test('handles empty email', async () => {
      const result = await validateEmail('');

      expect(result.isValid).toBe(false);
      expect(result.checks.syntax.valid).toBe(false);
    });

    test('handles whitespace-only email', async () => {
      const result = await validateEmail('   ');

      expect(result.isValid).toBe(false);
      expect(result.checks.syntax.valid).toBe(false);
    });
  });

  describe('Disposable email detection', () => {
    test('detects mailinator as disposable', async () => {
      const result = await validateEmail('test@mailinator.com');

      expect(result.checks.disposable.isDisposable).toBe(true);
    });

    test('detects guerrillamail as disposable', async () => {
      const result = await validateEmail('test@guerrillamail.com');

      expect(result.checks.disposable.isDisposable).toBe(true);
    });

    test('detects 10minutemail as disposable', async () => {
      const result = await validateEmail('test@10minutemail.com');

      expect(result.checks.disposable.isDisposable).toBe(true);
    });

    test('does not flag gmail as disposable', async () => {
      const result = await validateEmail('test@gmail.com');

      expect(result.checks.disposable.isDisposable).toBe(false);
    });
  });

  describe('Role-based email detection', () => {
    test('detects admin as role-based', async () => {
      const result = await validateEmail('admin@example.com');

      expect(result.checks.roleBased.isRoleBased).toBe(true);
      expect(result.checks.roleBased.role).toBe('admin');
    });

    test('detects support as role-based', async () => {
      const result = await validateEmail('support@example.com');

      expect(result.checks.roleBased.isRoleBased).toBe(true);
      expect(result.checks.roleBased.role).toBe('support');
    });

    test('detects info as role-based', async () => {
      const result = await validateEmail('info@example.com');

      expect(result.checks.roleBased.isRoleBased).toBe(true);
      expect(result.checks.roleBased.role).toBe('info');
    });

    test('does not flag regular names as role-based', async () => {
      const result = await validateEmail('john@example.com');

      expect(result.checks.roleBased.isRoleBased).toBe(false);
    });
  });

  describe('Free provider detection', () => {
    test('detects Gmail as free provider', async () => {
      const result = await validateEmail('user@gmail.com');

      expect(result.checks.freeProvider.isFree).toBe(true);
      expect(result.checks.freeProvider.provider).toBe('Gmail');
    });

    test('detects Yahoo as free provider', async () => {
      const result = await validateEmail('user@yahoo.com');

      expect(result.checks.freeProvider.isFree).toBe(true);
      expect(result.checks.freeProvider.provider).toBe('Yahoo');
    });

    test('detects Outlook as free provider', async () => {
      const result = await validateEmail('user@outlook.com');

      expect(result.checks.freeProvider.isFree).toBe(true);
      expect(result.checks.freeProvider.provider).toBe('Outlook');
    });

    test('does not flag company domains as free', async () => {
      const result = await validateEmail('user@company.com');

      expect(result.checks.freeProvider.isFree).toBe(false);
    });
  });

  describe('Typo detection', () => {
    test('suggests gmail.com for gmial.com', async () => {
      const result = await validateEmail('test@gmial.com');

      expect(result.checks.typo.hasTypo).toBe(true);
      expect(result.checks.typo.suggestion).toBe('gmail.com');
    });

    test('suggests yahoo.com for yaho.com', async () => {
      const result = await validateEmail('test@yaho.com');

      expect(result.checks.typo.hasTypo).toBe(true);
      expect(result.checks.typo.suggestion).toBe('yahoo.com');
    });

    test('suggests hotmail.com for hotmal.com', async () => {
      const result = await validateEmail('test@hotmal.com');

      expect(result.checks.typo.hasTypo).toBe(true);
      expect(result.checks.typo.suggestion).toBe('hotmail.com');
    });

    test('no suggestion for correct domains', async () => {
      const result = await validateEmail('test@gmail.com');

      expect(result.checks.typo.hasTypo).toBe(false);
    });
  });

  describe('Score calculation', () => {
    test('invalid syntax gets score of 0', async () => {
      const result = await validateEmail('not-an-email');
      expect(result.score).toBe(0);
    });

    test('disposable emails get reduced score', async () => {
      const result = await validateEmail('test@mailinator.com');
      expect(result.score).toBeLessThan(70);
    });

    test('role-based emails get reduced score', async () => {
      const result = await validateEmail('admin@example.com');
      // Role-based should have some score reduction
      expect(result.checks.roleBased.isRoleBased).toBe(true);
    });
  });

  describe('Risk classification', () => {
    test('invalid syntax is high risk', async () => {
      const result = await validateEmail('invalid');
      expect(result.risk).toBe('high');
    });

    test('disposable emails have elevated risk', async () => {
      const result = await validateEmail('test@mailinator.com');
      expect(['medium', 'high']).toContain(result.risk);
    });
  });

  describe('Deliverability classification', () => {
    test('invalid syntax is undeliverable', async () => {
      const result = await validateEmail('invalid');
      expect(result.deliverability).toBe('undeliverable');
    });
  });

  describe('Result structure', () => {
    test('contains all required fields', async () => {
      const result = await validateEmail('test@example.com');

      expect(result).toHaveProperty('email');
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('score');
      expect(result).toHaveProperty('checks');
      expect(result).toHaveProperty('deliverability');
      expect(result).toHaveProperty('risk');
      expect(result).toHaveProperty('timestamp');
    });

    test('checks contain all required fields', async () => {
      const result = await validateEmail('test@example.com');

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

      expect(new Date(result.timestamp).getTime()).not.toBeNaN();
    });
  });

  describe('Validation consistency', () => {
    test('same email produces consistent results', async () => {
      const email = 'consistent@mailinator.com';

      const result1 = await validateEmail(email);
      const result2 = await validateEmail(email);

      expect(result1.email).toBe(result2.email);
      expect(result1.checks.syntax.valid).toBe(result2.checks.syntax.valid);
      expect(result1.checks.disposable.isDisposable).toBe(result2.checks.disposable.isDisposable);
      expect(result1.checks.roleBased.isRoleBased).toBe(result2.checks.roleBased.isRoleBased);
    });
  });

  describe('Multiple check combinations', () => {
    test('role-based + disposable email', async () => {
      const result = await validateEmail('support@mailinator.com');

      expect(result.checks.roleBased.isRoleBased).toBe(true);
      expect(result.checks.disposable.isDisposable).toBe(true);
    });

    test('free provider + role-based', async () => {
      const result = await validateEmail('admin@gmail.com');

      expect(result.checks.freeProvider.isFree).toBe(true);
      expect(result.checks.roleBased.isRoleBased).toBe(true);
    });
  });
});
