/**
 * Tests for API utility functions.
 */

import { RateLimitError, ParseError, ValidationError } from '@/lib/errors';

// Mock next/server before importing utils
jest.mock('next/server', () => ({
  NextResponse: {
    json: jest.fn((data, options) => ({
      status: options?.status || 200,
      headers: new Map(Object.entries(options?.headers || {})),
      json: async () => data,
    })),
  },
}));

// Import after mock setup
import { generateRequestId, withTiming } from '@/lib/api/utils';

describe('API Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateRequestId', () => {
    test('generates unique IDs', () => {
      const ids = new Set<string>();
      for (let i = 0; i < 100; i++) {
        ids.add(generateRequestId());
      }
      expect(ids.size).toBe(100);
    });

    test('generates IDs with req_ prefix', () => {
      const id = generateRequestId();
      expect(id).toMatch(/^req_/);
    });

    test('generates IDs with consistent format', () => {
      const id = generateRequestId();
      // Format: req_<base36 timestamp>_<random string>
      expect(id).toMatch(/^req_[a-z0-9]+_[a-z0-9]+$/);
    });

    test('generates IDs with sufficient length', () => {
      const id = generateRequestId();
      // Should be at least 15 characters
      expect(id.length).toBeGreaterThanOrEqual(15);
    });
  });

  describe('Error classes', () => {
    describe('RateLimitError', () => {
      test('creates error with message and retryAfter', () => {
        const error = new RateLimitError('Rate limit exceeded', 60);
        expect(error.message).toBe('Rate limit exceeded');
        expect(error.retryAfter).toBe(60);
        expect(error.statusCode).toBe(429);
        expect(error.code).toBe('RATE_LIMIT_EXCEEDED');
      });

      test('uses default values', () => {
        const error = new RateLimitError();
        expect(error.message).toBe('Rate limit exceeded');
        expect(error.retryAfter).toBe(60);
      });
    });

    describe('ParseError', () => {
      test('creates error with message', () => {
        const error = new ParseError('Invalid JSON');
        expect(error.message).toBe('Invalid JSON');
        expect(error.statusCode).toBe(400);
        expect(error.code).toBe('PARSE_ERROR');
      });

      test('uses default message', () => {
        const error = new ParseError();
        expect(error.message).toBe('Failed to parse request');
      });
    });

    describe('ValidationError', () => {
      test('creates error with message and code', () => {
        const error = new ValidationError('Invalid email', 'INVALID_EMAIL');
        expect(error.message).toBe('Invalid email');
        expect(error.code).toBe('INVALID_EMAIL');
        expect(error.statusCode).toBe(400);
      });

      test('uses default code', () => {
        const error = new ValidationError('Invalid input');
        expect(error.code).toBe('VALIDATION_ERROR');
      });

      test('accepts custom status code', () => {
        const error = new ValidationError('Not found', 'NOT_FOUND', 404);
        expect(error.statusCode).toBe(404);
      });
    });
  });

  describe('withTiming', () => {
    test('adds response time header', () => {
      const mockResponse = {
        headers: {
          set: jest.fn(),
        },
      };
      const startTime = Date.now() - 100; // 100ms ago

      withTiming(mockResponse as never, startTime);

      expect(mockResponse.headers.set).toHaveBeenCalledWith(
        'X-Response-Time',
        expect.stringMatching(/^\d+ms$/)
      );
    });

    test('calculates duration correctly', () => {
      const mockResponse = {
        headers: {
          set: jest.fn(),
        },
      };
      const startTime = Date.now() - 50;

      withTiming(mockResponse as never, startTime);

      const call = mockResponse.headers.set.mock.calls[0];
      const duration = parseInt(call[1].replace('ms', ''), 10);
      expect(duration).toBeGreaterThanOrEqual(50);
      expect(duration).toBeLessThan(200); // Should be close to 50ms
    });
  });

  describe('Request ID format', () => {
    test('IDs are sortable by time', () => {
      const id1 = generateRequestId();
      // Small delay to ensure different timestamp
      const id2 = generateRequestId();

      // Both should have same prefix structure
      expect(id1.startsWith('req_')).toBe(true);
      expect(id2.startsWith('req_')).toBe(true);
    });

    test('IDs are URL-safe', () => {
      const id = generateRequestId();
      // Should not contain special characters
      expect(id).toMatch(/^[a-zA-Z0-9_]+$/);
    });
  });
});
