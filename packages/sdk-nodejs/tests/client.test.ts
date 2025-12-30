/**
 * Email Validator SDK Tests
 */

import { EmailValidator } from '../src/client';
import {
  ValidationError,
  AuthenticationError,
  RateLimitError,
} from '../src/errors';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('EmailValidator SDK', () => {
  let validator: EmailValidator;

  beforeEach(() => {
    validator = new EmailValidator({
      baseUrl: 'http://localhost:3000',
      apiKey: 'test-key',
      maxRetries: 0, // Disable retries for tests
    });
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('validates email successfully', async () => {
      const mockResult = {
        email: 'test@example.com',
        valid: true,
        score: 95,
        deliverability: 'deliverable',
        risk: 'low',
        checks: {},
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResult),
      });

      const result = await validator.validate('test@example.com');

      expect(result.valid).toBe(true);
      expect(result.score).toBe(95);
    });

    it('throws ValidationError for empty email', async () => {
      await expect(validator.validate('')).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for null email', async () => {
      await expect(validator.validate(null as unknown as string)).rejects.toThrow(
        ValidationError
      );
    });

    it('throws ValidationError for invalid format', async () => {
      await expect(validator.validate('not-an-email')).rejects.toThrow(
        ValidationError
      );
    });

    it('includes API key in header', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ valid: true }),
      });

      await validator.validate('test@example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Key': 'test-key',
          }),
        })
      );
    });

    it('includes User-Agent header', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ valid: true }),
      });

      await validator.validate('test@example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'User-Agent': 'EmailValidator-NodeJS-SDK/1.0.0',
          }),
        })
      );
    });

    it('passes options to API', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ valid: true }),
      });

      await validator.validate('test@example.com', {
        smtpCheck: true,
        reputationCheck: true,
      });

      const call = mockFetch.mock.calls[0];
      const body = JSON.parse(call[1].body);

      expect(body.smtpCheck).toBe(true);
      expect(body.reputationCheck).toBe(true);
    });

    it('sends correct endpoint', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ valid: true }),
      });

      await validator.validate('test@example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/validate',
        expect.any(Object)
      );
    });
  });

  describe('validateBulk', () => {
    it('validates bulk emails successfully', async () => {
      const mockResult = {
        results: [],
        summary: { total: 2, valid: 2, invalid: 0, risky: 0, unknown: 0 },
        processingTime: 100,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResult),
      });

      const result = await validator.validateBulk(['a@b.com', 'c@d.com']);

      expect(result.summary.total).toBe(2);
    });

    it('throws ValidationError for empty array', async () => {
      await expect(validator.validateBulk([])).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for null input', async () => {
      await expect(
        validator.validateBulk(null as unknown as string[])
      ).rejects.toThrow(ValidationError);
    });

    it('throws ValidationError for too many emails', async () => {
      const emails = Array(1001).fill('test@example.com');
      await expect(validator.validateBulk(emails)).rejects.toThrow(
        ValidationError
      );
      await expect(validator.validateBulk(emails)).rejects.toThrow(
        'Maximum 1000 emails per request'
      );
    });

    it('sends correct endpoint', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ results: [], summary: {} }),
      });

      await validator.validateBulk(['a@b.com']);

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/validate-bulk',
        expect.any(Object)
      );
    });
  });

  describe('healthCheck', () => {
    it('returns health status', async () => {
      const mockResult = {
        status: 'healthy',
        version: '1.0.0',
        uptime: 12345,
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResult),
      });

      const result = await validator.healthCheck();

      expect(result.status).toBe('healthy');
      expect(result.version).toBe('1.0.0');
    });

    it('sends GET request to correct endpoint', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: 'healthy' }),
      });

      await validator.healthCheck();

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/health',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });
  });

  describe('error handling', () => {
    it('throws AuthenticationError on 401', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ error: 'Unauthorized' }),
      });

      await expect(validator.validate('test@example.com')).rejects.toThrow(
        AuthenticationError
      );
    });

    it('throws RateLimitError on 429', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        headers: {
          get: (name: string) => (name === 'Retry-After' ? '60' : null),
        },
        json: () => Promise.resolve({ error: 'Rate limited' }),
      });

      await expect(validator.validate('test@example.com')).rejects.toThrow(
        RateLimitError
      );
    });

    it('includes retryAfter from header', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        headers: {
          get: (name: string) => (name === 'Retry-After' ? '120' : null),
        },
        json: () => Promise.resolve({ error: 'Rate limited' }),
      });

      try {
        await validator.validate('test@example.com');
      } catch (error) {
        expect(error).toBeInstanceOf(RateLimitError);
        expect((error as RateLimitError).retryAfter).toBe(120);
      }
    });

    it('handles non-retryable errors without retry', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ error: 'Bad request' }),
      });

      await expect(validator.validate('test@example.com')).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('retry logic', () => {
    it('retries on 500 error', async () => {
      const validatorWithRetry = new EmailValidator({
        baseUrl: 'http://localhost:3000',
        maxRetries: 2,
        retryDelay: 10, // Short delay for tests
      });

      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({ ok: false, status: 500 })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ valid: true }),
        });

      const result = await validatorWithRetry.validate('test@example.com');

      expect(result.valid).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('retries on network error', async () => {
      const validatorWithRetry = new EmailValidator({
        baseUrl: 'http://localhost:3000',
        maxRetries: 1,
        retryDelay: 10,
      });

      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ valid: true }),
        });

      const result = await validatorWithRetry.validate('test@example.com');

      expect(result.valid).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('fails after max retries', async () => {
      const validatorWithRetry = new EmailValidator({
        baseUrl: 'http://localhost:3000',
        maxRetries: 2,
        retryDelay: 10,
      });

      mockFetch.mockResolvedValue({ ok: false, status: 500 });

      await expect(
        validatorWithRetry.validate('test@example.com')
      ).rejects.toThrow();
      expect(mockFetch).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });
  });

  describe('configuration', () => {
    it('uses default config values', () => {
      const validatorDefault = new EmailValidator({
        baseUrl: 'http://localhost:3000',
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ valid: true }),
      });

      // The validator should work with defaults
      expect(validatorDefault).toBeDefined();
    });

    it('allows custom baseUrl', async () => {
      const customValidator = new EmailValidator({
        baseUrl: 'https://custom-api.com',
        maxRetries: 0,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ valid: true }),
      });

      await customValidator.validate('test@example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom-api.com/api/validate',
        expect.any(Object)
      );
    });
  });
});
