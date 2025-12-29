/**
 * @jest-environment node
 */

/**
 * Tests for Authentication Module
 */

import { NextRequest } from 'next/server';
import {
  authenticateRequest,
  getAPIKeyFromRequest,
  isAuthRequired,
  createUnauthorizedResponse,
  AuthenticationError,
} from '@/lib/security/auth';
import { clearAPIKeysCache } from '@/lib/security/api-keys';

describe('Authentication Module', () => {
  // Store original env
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    clearAPIKeysCache();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isAuthRequired', () => {
    it('should return true when API_KEY_REQUIRED is true', () => {
      process.env.API_KEY_REQUIRED = 'true';
      expect(isAuthRequired()).toBe(true);
    });

    it('should return false when API_KEY_REQUIRED is false', () => {
      process.env.API_KEY_REQUIRED = 'false';
      expect(isAuthRequired()).toBe(false);
    });

    it('should return false when API_KEY_REQUIRED is not set', () => {
      delete process.env.API_KEY_REQUIRED;
      expect(isAuthRequired()).toBe(false);
    });
  });

  describe('getAPIKeyFromRequest', () => {
    it('should get API key from X-API-Key header', () => {
      const request = new NextRequest('http://localhost:3000/api/validate', {
        method: 'POST',
        headers: {
          'X-API-Key': 'my-api-key',
        },
      });

      expect(getAPIKeyFromRequest(request)).toBe('my-api-key');
    });

    it('should get API key from Authorization Bearer header', () => {
      const request = new NextRequest('http://localhost:3000/api/validate', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer my-bearer-token',
        },
      });

      expect(getAPIKeyFromRequest(request)).toBe('my-bearer-token');
    });

    it('should get API key from query parameter', () => {
      const request = new NextRequest(
        'http://localhost:3000/api/validate?api_key=my-query-key',
        {
          method: 'POST',
        }
      );

      expect(getAPIKeyFromRequest(request)).toBe('my-query-key');
    });

    it('should prefer X-API-Key over other methods', () => {
      const request = new NextRequest(
        'http://localhost:3000/api/validate?api_key=query-key',
        {
          method: 'POST',
          headers: {
            'X-API-Key': 'header-key',
            Authorization: 'Bearer bearer-key',
          },
        }
      );

      expect(getAPIKeyFromRequest(request)).toBe('header-key');
    });

    it('should return null when no API key provided', () => {
      const request = new NextRequest('http://localhost:3000/api/validate', {
        method: 'POST',
      });

      expect(getAPIKeyFromRequest(request)).toBeNull();
    });
  });

  describe('authenticateRequest', () => {
    beforeEach(() => {
      process.env.API_KEYS = 'validkey:TestApp:validate,bulk:pro';
      process.env.API_KEY_REQUIRED = 'true';
      clearAPIKeysCache();
    });

    it('should authenticate with valid API key', () => {
      const request = new NextRequest('http://localhost:3000/api/validate', {
        method: 'POST',
        headers: {
          'X-API-Key': 'validkey',
        },
      });

      const result = authenticateRequest(request);

      expect(result.authenticated).toBe(true);
      expect(result.apiKey?.name).toBe('TestApp');
      expect(result.rateLimit).toBe(1000); // pro tier
    });

    it('should reject invalid API key', () => {
      const request = new NextRequest('http://localhost:3000/api/validate', {
        method: 'POST',
        headers: {
          'X-API-Key': 'invalidkey',
        },
      });

      const result = authenticateRequest(request);

      expect(result.authenticated).toBe(false);
      expect(result.errorCode).toBe('INVALID_KEY');
    });

    it('should allow same-origin request without API key', () => {
      const request = new NextRequest('http://localhost:3000/api/validate', {
        method: 'POST',
        headers: {
          host: 'localhost:3000',
          // No origin = same-origin
        },
      });

      const result = authenticateRequest(request);

      expect(result.authenticated).toBe(true);
      expect(result.rateLimit).toBe(100); // frontend rate limit
    });

    it('should reject external request without API key when required', () => {
      const request = new NextRequest('http://localhost:3000/api/validate', {
        method: 'POST',
        headers: {
          origin: 'http://external.com',
          host: 'localhost:3000',
        },
      });

      const result = authenticateRequest(request);

      expect(result.authenticated).toBe(false);
      expect(result.errorCode).toBe('MISSING_KEY');
    });

    it('should allow external request without API key when not required', () => {
      process.env.API_KEY_REQUIRED = 'false';

      const request = new NextRequest('http://localhost:3000/api/validate', {
        method: 'POST',
        headers: {
          origin: 'http://external.com',
          host: 'localhost:3000',
        },
      });

      const result = authenticateRequest(request);

      expect(result.authenticated).toBe(true);
      expect(result.rateLimit).toBe(20); // anonymous rate limit
    });

    it('should check permissions when required', () => {
      process.env.API_KEYS = 'limitedkey:Limited:validate:free';
      clearAPIKeysCache();

      const request = new NextRequest('http://localhost:3000/api/validate-bulk', {
        method: 'POST',
        headers: {
          'X-API-Key': 'limitedkey',
        },
      });

      const result = authenticateRequest(request, 'bulk');

      expect(result.authenticated).toBe(false);
      expect(result.errorCode).toBe('INSUFFICIENT_PERMISSIONS');
    });
  });

  describe('createUnauthorizedResponse', () => {
    it('should create 401 response with error message', async () => {
      const response = createUnauthorizedResponse('API key is required', 'MISSING_KEY');

      expect(response.status).toBe(401);

      const body = await response.json();
      expect(body.error).toBe('API key is required');
      expect(body.code).toBe('MISSING_KEY');
    });

    it('should include WWW-Authenticate header', () => {
      const response = createUnauthorizedResponse('Unauthorized');

      expect(response.headers.get('WWW-Authenticate')).toContain('Bearer');
    });
  });

  describe('AuthenticationError', () => {
    it('should create error with correct properties', () => {
      const error = new AuthenticationError('Invalid API key', 'INVALID_KEY');

      expect(error.message).toBe('Invalid API key');
      expect(error.code).toBe('INVALID_KEY');
      expect(error.statusCode).toBe(401);
      expect(error.name).toBe('AuthenticationError');
    });

    it('should default code to UNAUTHORIZED', () => {
      const error = new AuthenticationError('Unauthorized');

      expect(error.code).toBe('UNAUTHORIZED');
    });
  });
});
