/**
 * @jest-environment node
 */

/**
 * Tests for API Key Management System
 */

import { NextRequest } from 'next/server';
import {
  parseAPIKeysFromEnv,
  validateAPIKey,
  getAPIKeyRateLimit,
  isSameOriginRequest,
  generateAPIKey,
  clearAPIKeysCache,
  TIER_RATE_LIMITS,
  type APIKey,
} from '@/lib/security/api-keys';

describe('API Key Management', () => {
  // Store original env
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment and cache before each test
    process.env = { ...originalEnv };
    clearAPIKeysCache();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('parseAPIKeysFromEnv', () => {
    it('should return empty map when no API_KEYS env var', () => {
      delete process.env.API_KEYS;
      const keys = parseAPIKeysFromEnv();
      expect(keys.size).toBe(0);
    });

    it('should return empty map for empty string', () => {
      process.env.API_KEYS = '';
      const keys = parseAPIKeysFromEnv();
      expect(keys.size).toBe(0);
    });

    it('should parse a single API key', () => {
      process.env.API_KEYS = 'testkey123:MyApp:validate:free';
      const keys = parseAPIKeysFromEnv();

      expect(keys.size).toBe(1);
      expect(keys.has('testkey123')).toBe(true);

      const key = keys.get('testkey123');
      expect(key?.name).toBe('MyApp');
      expect(key?.permissions).toContain('validate');
      expect(key?.tier).toBe('free');
    });

    it('should parse multiple API keys', () => {
      process.env.API_KEYS = 'key1:App1:validate:free;key2:App2:validate,bulk:pro';
      const keys = parseAPIKeysFromEnv();

      expect(keys.size).toBe(2);
      expect(keys.has('key1')).toBe(true);
      expect(keys.has('key2')).toBe(true);

      const key2 = keys.get('key2');
      expect(key2?.permissions).toContain('validate');
      expect(key2?.permissions).toContain('bulk');
      expect(key2?.tier).toBe('pro');
    });

    it('should parse API key with expiration date', () => {
      const futureDate = '2030-12-31';
      process.env.API_KEYS = `testkey:MyApp:validate:free:${futureDate}`;
      const keys = parseAPIKeysFromEnv();

      const key = keys.get('testkey');
      expect(key?.expiresAt).toBeDefined();
      expect(key?.expiresAt?.getFullYear()).toBe(2030);
    });

    it('should default to free tier if invalid tier provided', () => {
      process.env.API_KEYS = 'testkey:MyApp:validate:invalid';
      const keys = parseAPIKeysFromEnv();

      const key = keys.get('testkey');
      expect(key?.tier).toBe('free');
    });

    it('should skip invalid entries with less than 3 parts', () => {
      process.env.API_KEYS = 'invalid;key1:name:validate';
      const keys = parseAPIKeysFromEnv();

      expect(keys.size).toBe(1);
      expect(keys.has('key1')).toBe(true);
    });

    it('should parse admin permission', () => {
      process.env.API_KEYS = 'adminkey:Admin:admin:enterprise';
      const keys = parseAPIKeysFromEnv();

      const key = keys.get('adminkey');
      expect(key?.permissions).toContain('admin');
      expect(key?.tier).toBe('enterprise');
    });
  });

  describe('validateAPIKey', () => {
    beforeEach(() => {
      process.env.API_KEYS = 'validkey:TestApp:validate,bulk:pro;expiredkey:OldApp:validate:free:2020-01-01';
      process.env.API_KEY_REQUIRED = 'true';
      clearAPIKeysCache();
    });

    it('should return valid for correct API key', () => {
      const result = validateAPIKey('validkey');

      expect(result.valid).toBe(true);
      expect(result.key?.name).toBe('TestApp');
    });

    it('should return invalid for missing key when required', () => {
      const result = validateAPIKey(null);

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('MISSING_KEY');
    });

    it('should return invalid for unknown key', () => {
      const result = validateAPIKey('unknownkey');

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INVALID_KEY');
    });

    it('should return invalid for expired key', () => {
      const result = validateAPIKey('expiredkey');

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('EXPIRED_KEY');
    });

    it('should check permissions when required', () => {
      const result = validateAPIKey('validkey', 'bulk');

      expect(result.valid).toBe(true);
    });

    it('should return insufficient permissions error', () => {
      process.env.API_KEYS = 'limitedkey:Limited:validate:free';
      clearAPIKeysCache();

      const result = validateAPIKey('limitedkey', 'bulk');

      expect(result.valid).toBe(false);
      expect(result.errorCode).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should allow admin to access any permission', () => {
      process.env.API_KEYS = 'adminkey:Admin:admin:enterprise';
      clearAPIKeysCache();

      const result = validateAPIKey('adminkey', 'bulk');

      expect(result.valid).toBe(true);
    });

    it('should allow through when API_KEY_REQUIRED is false and no key', () => {
      process.env.API_KEY_REQUIRED = 'false';

      const result = validateAPIKey(null);

      expect(result.valid).toBe(true);
    });
  });

  describe('getAPIKeyRateLimit', () => {
    it('should return anonymous rate limit for undefined key', () => {
      const limit = getAPIKeyRateLimit(undefined);
      expect(limit).toBe(20);
    });

    it('should return free tier limit', () => {
      const key: APIKey = {
        key: 'test',
        name: 'Test',
        permissions: ['validate'],
        tier: 'free',
        createdAt: new Date(),
      };

      const limit = getAPIKeyRateLimit(key);
      expect(limit).toBe(TIER_RATE_LIMITS.free);
    });

    it('should return pro tier limit', () => {
      const key: APIKey = {
        key: 'test',
        name: 'Test',
        permissions: ['validate'],
        tier: 'pro',
        createdAt: new Date(),
      };

      const limit = getAPIKeyRateLimit(key);
      expect(limit).toBe(TIER_RATE_LIMITS.pro);
    });

    it('should return enterprise tier limit', () => {
      const key: APIKey = {
        key: 'test',
        name: 'Test',
        permissions: ['validate'],
        tier: 'enterprise',
        createdAt: new Date(),
      };

      const limit = getAPIKeyRateLimit(key);
      expect(limit).toBe(TIER_RATE_LIMITS.enterprise);
    });

    it('should return custom rate limit if set', () => {
      const key: APIKey = {
        key: 'test',
        name: 'Test',
        permissions: ['validate'],
        tier: 'free',
        rateLimit: 500,
        createdAt: new Date(),
      };

      const limit = getAPIKeyRateLimit(key);
      expect(limit).toBe(500);
    });
  });

  describe('isSameOriginRequest', () => {
    it('should return true when no origin or referer', () => {
      const request = new NextRequest('http://localhost:3000/api/validate', {
        method: 'POST',
      });

      expect(isSameOriginRequest(request)).toBe(true);
    });

    it('should return true when origin matches host', () => {
      const request = new NextRequest('http://localhost:3000/api/validate', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          host: 'localhost:3000',
        },
      });

      expect(isSameOriginRequest(request)).toBe(true);
    });

    it('should return true for localhost variants', () => {
      const request = new NextRequest('http://127.0.0.1:3000/api/validate', {
        method: 'POST',
        headers: {
          origin: 'http://localhost:3000',
          host: '127.0.0.1:3000',
        },
      });

      expect(isSameOriginRequest(request)).toBe(true);
    });

    it('should return false for different origin', () => {
      const request = new NextRequest('http://localhost:3000/api/validate', {
        method: 'POST',
        headers: {
          origin: 'http://evil.com',
          host: 'localhost:3000',
        },
      });

      expect(isSameOriginRequest(request)).toBe(false);
    });

    it('should check referer when origin is missing', () => {
      const request = new NextRequest('http://localhost:3000/api/validate', {
        method: 'POST',
        headers: {
          referer: 'http://localhost:3000/page',
          host: 'localhost:3000',
        },
      });

      expect(isSameOriginRequest(request)).toBe(true);
    });
  });

  describe('generateAPIKey', () => {
    it('should generate key of default length', () => {
      const key = generateAPIKey();
      expect(key.length).toBe(32);
    });

    it('should generate key of custom length', () => {
      const key = generateAPIKey(64);
      expect(key.length).toBe(64);
    });

    it('should generate unique keys', () => {
      const keys = new Set<string>();
      for (let i = 0; i < 100; i++) {
        keys.add(generateAPIKey());
      }
      expect(keys.size).toBe(100);
    });

    it('should only contain alphanumeric characters', () => {
      const key = generateAPIKey();
      expect(key).toMatch(/^[A-Za-z0-9]+$/);
    });
  });

  describe('TIER_RATE_LIMITS', () => {
    it('should have correct tier limits', () => {
      expect(TIER_RATE_LIMITS.free).toBe(100);
      expect(TIER_RATE_LIMITS.pro).toBe(1000);
      expect(TIER_RATE_LIMITS.enterprise).toBe(10000);
    });
  });
});
