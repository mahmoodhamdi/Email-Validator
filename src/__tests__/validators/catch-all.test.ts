/**
 * Tests for catch-all validation.
 */

import {
  validateCatchAll,
  isKnownCatchAll,
  clearCatchAllCache,
  getCatchAllCacheStats,
} from '@/lib/validators/catch-all';

beforeEach(() => {
  clearCatchAllCache();
});

describe('validateCatchAll', () => {
  describe('known catch-all domains', () => {
    it('should detect mailinator.com as catch-all', () => {
      const result = validateCatchAll('mailinator.com');

      expect(result.isCatchAll).toBe(true);
    });

    it('should detect guerrillamail.com as catch-all', () => {
      const result = validateCatchAll('guerrillamail.com');

      expect(result.isCatchAll).toBe(true);
    });

    it('should detect yopmail.com as catch-all', () => {
      const result = validateCatchAll('yopmail.com');

      expect(result.isCatchAll).toBe(true);
    });

    it('should detect temp-mail.org as catch-all', () => {
      const result = validateCatchAll('temp-mail.org');

      expect(result.isCatchAll).toBe(true);
    });

    it('should detect trashmail.com as catch-all', () => {
      const result = validateCatchAll('trashmail.com');

      expect(result.isCatchAll).toBe(true);
    });
  });

  describe('subdomains of catch-all domains', () => {
    it('should detect subdomain of known catch-all domain', () => {
      const result = validateCatchAll('sub.mailinator.com');

      expect(result.isCatchAll).toBe(true);
    });

    it('should detect deep subdomain of catch-all domain', () => {
      const result = validateCatchAll('a.b.guerrillamail.com');

      expect(result.isCatchAll).toBe(true);
    });
  });

  describe('pattern matching', () => {
    it('should detect domains starting with tempmail', () => {
      const result = validateCatchAll('tempmail-service.com');

      expect(result.isCatchAll).toBe(true);
    });

    it('should detect domains containing temp-mail pattern', () => {
      const result = validateCatchAll('temp-mail.net');

      expect(result.isCatchAll).toBe(true);
    });

    it('should detect domains containing throwaway', () => {
      const result = validateCatchAll('throwawayservice.com');

      expect(result.isCatchAll).toBe(true);
    });

    it('should detect domains starting with disposable', () => {
      const result = validateCatchAll('disposablemail.net');

      expect(result.isCatchAll).toBe(true);
    });

    it('should detect domains starting with guerrilla', () => {
      const result = validateCatchAll('guerrillaservice.com');

      expect(result.isCatchAll).toBe(true);
    });
  });

  describe('regular domains', () => {
    it('should return false for gmail.com', () => {
      const result = validateCatchAll('gmail.com');

      expect(result.isCatchAll).toBe(false);
    });

    it('should return false for company domains', () => {
      const result = validateCatchAll('example-company.com');

      expect(result.isCatchAll).toBe(false);
    });

    it('should return false for regular domains', () => {
      const domains = [
        'google.com',
        'microsoft.com',
        'apple.com',
        'amazon.com',
        'facebook.com',
      ];

      for (const domain of domains) {
        const result = validateCatchAll(domain);
        expect(result.isCatchAll).toBe(false);
      }
    });
  });

  describe('case sensitivity', () => {
    it('should handle uppercase domains', () => {
      const result = validateCatchAll('MAILINATOR.COM');

      expect(result.isCatchAll).toBe(true);
    });

    it('should handle mixed case domains', () => {
      const result = validateCatchAll('YopMail.Com');

      expect(result.isCatchAll).toBe(true);
    });
  });

  describe('caching', () => {
    it('should cache results', () => {
      // First call
      const result1 = validateCatchAll('test-domain.com');

      // Second call (should use cache)
      const result2 = validateCatchAll('test-domain.com');

      expect(result1).toEqual(result2);

      const stats = getCatchAllCacheStats();
      expect(stats.hits).toBe(1);
    });

    it('should normalize domain for caching', () => {
      // Clear any previous cache state
      clearCatchAllCache();

      validateCatchAll('EXAMPLE.COM');
      validateCatchAll('example.com');

      const stats = getCatchAllCacheStats();
      // First call sets cache, second call should hit
      expect(stats.hits).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('isKnownCatchAll', () => {
  it('should return true for known catch-all domains', () => {
    expect(isKnownCatchAll('mailinator.com')).toBe(true);
    expect(isKnownCatchAll('guerrillamail.com')).toBe(true);
    expect(isKnownCatchAll('yopmail.com')).toBe(true);
  });

  it('should return false for regular domains', () => {
    expect(isKnownCatchAll('gmail.com')).toBe(false);
    expect(isKnownCatchAll('example.com')).toBe(false);
  });

  it('should be case insensitive', () => {
    expect(isKnownCatchAll('MAILINATOR.COM')).toBe(true);
    expect(isKnownCatchAll('Guerrillamail.COM')).toBe(true);
  });
});

describe('clearCatchAllCache', () => {
  it('should clear the cache', () => {
    validateCatchAll('test.com');

    const statsBefore = getCatchAllCacheStats();
    expect(statsBefore.size).toBe(1);

    clearCatchAllCache();

    const statsAfter = getCatchAllCacheStats();
    expect(statsAfter.size).toBe(0);
  });
});
