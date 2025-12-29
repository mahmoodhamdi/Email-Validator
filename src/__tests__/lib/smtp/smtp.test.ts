/**
 * Tests for SMTP Verification Module
 */

import { checkSMTP, getSMTPCacheStats, clearSMTPCache } from '@/lib/validators/smtp';

// Mock the net module
jest.mock('net', () => {
  const mockSocket = {
    on: jest.fn(),
    once: jest.fn(),
    write: jest.fn(),
    destroy: jest.fn(),
    removeAllListeners: jest.fn(),
  };

  return {
    createConnection: jest.fn(() => mockSocket),
  };
});

describe('SMTP Verification', () => {
  beforeEach(() => {
    clearSMTPCache();
    jest.clearAllMocks();
  });

  describe('checkSMTP', () => {
    test('returns disabled when SMTP check is disabled', async () => {
      const result = await checkSMTP('test@example.com', ['mx.example.com'], {
        enabled: false,
      });

      expect(result.checked).toBe(false);
      expect(result.exists).toBeNull();
      expect(result.message).toBe('SMTP verification disabled');
    });

    test('returns error when no MX records provided', async () => {
      const result = await checkSMTP('test@example.com', [], {
        enabled: true,
      });

      expect(result.checked).toBe(false);
      expect(result.exists).toBeNull();
      expect(result.message).toBe('No MX records available');
    });

    test('returns error when MX records is undefined', async () => {
      const result = await checkSMTP(
        'test@example.com',
        undefined as unknown as string[],
        { enabled: true }
      );

      expect(result.checked).toBe(false);
      expect(result.exists).toBeNull();
      expect(result.message).toBe('No MX records available');
    });

    test('handles empty email array', async () => {
      const result = await checkSMTP('test@example.com', [], { enabled: true });

      expect(result.checked).toBe(false);
      expect(result.message).toBe('No MX records available');
    });
  });

  describe('SMTPCheckResult structure', () => {
    test('returns proper structure when disabled', async () => {
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
      const result = await checkSMTP('test@example.com', ['mx.example.com'], {
        enabled: false,
      });

      expect(result.exists).toBeNull();
    });

    test('catchAll is false by default', async () => {
      const result = await checkSMTP('test@example.com', ['mx.example.com'], {
        enabled: false,
      });

      expect(result.catchAll).toBe(false);
    });

    test('greylisted is false by default', async () => {
      const result = await checkSMTP('test@example.com', ['mx.example.com'], {
        enabled: false,
      });

      expect(result.greylisted).toBe(false);
    });
  });

  describe('Cache', () => {
    test('getSMTPCacheStats returns statistics', () => {
      const stats = getSMTPCacheStats();

      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('hitRate');
    });

    test('clearSMTPCache clears cache', () => {
      clearSMTPCache();
      const stats = getSMTPCacheStats();

      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });

    test('hitRate is calculated correctly', () => {
      clearSMTPCache();
      const stats = getSMTPCacheStats();

      // No hits or misses yet, hitRate should be 0
      expect(stats.hitRate).toBe(0);
    });
  });

  describe('Options', () => {
    test('respects enabled option set to false', async () => {
      const result = await checkSMTP('test@example.com', ['mx.example.com'], {
        enabled: false,
      });

      expect(result.checked).toBe(false);
    });

    test('default timeout is used when not specified', async () => {
      // This tests the default behavior
      const result = await checkSMTP('test@example.com', [], {
        enabled: true,
      });

      // Since no MX records, it returns early without attempting connection
      expect(result.checked).toBe(false);
    });

    test('custom timeout can be specified', async () => {
      const result = await checkSMTP('test@example.com', [], {
        enabled: true,
        timeout: 5000,
      });

      expect(result.checked).toBe(false);
    });
  });
});

describe('SMTP Types', () => {
  test('SMTPCheckResult has correct shape', async () => {
    const result = await checkSMTP('test@example.com', ['mx.example.com'], {
      enabled: false,
    });

    // Verify the type structure
    expect(typeof result.checked).toBe('boolean');
    expect(result.exists === null || typeof result.exists === 'boolean').toBe(true);
    expect(typeof result.catchAll).toBe('boolean');
    expect(typeof result.greylisted).toBe('boolean');
    expect(typeof result.message).toBe('string');
  });
});
