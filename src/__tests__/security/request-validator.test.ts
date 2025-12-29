/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import {
  validateRequestHeaders,
  safeParseJSON,
  createValidationErrorResponse,
} from '@/lib/security/request-validator';
import { INPUT_LIMITS } from '@/lib/constants';

describe('Request Validator', () => {
  describe('validateRequestHeaders', () => {
    function createRequest(
      method: string,
      headers: Record<string, string> = {}
    ): NextRequest {
      const headerInit = new Headers();
      for (const [key, value] of Object.entries(headers)) {
        headerInit.set(key, value);
      }
      return new NextRequest('http://localhost:3000/api/validate', {
        method,
        headers: headerInit,
      });
    }

    describe('Content-Type validation', () => {
      test('should accept valid Content-Type for POST', () => {
        const request = createRequest('POST', {
          'content-type': 'application/json',
        });
        const result = validateRequestHeaders(request);
        expect(result.valid).toBe(true);
      });

      test('should accept Content-Type with charset', () => {
        const request = createRequest('POST', {
          'content-type': 'application/json; charset=utf-8',
        });
        const result = validateRequestHeaders(request);
        expect(result.valid).toBe(true);
      });

      test('should reject missing Content-Type for POST', () => {
        const request = createRequest('POST', {});
        const result = validateRequestHeaders(request);
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe('MISSING_CONTENT_TYPE');
      });

      test('should reject invalid Content-Type', () => {
        const request = createRequest('POST', {
          'content-type': 'text/html',
        });
        const result = validateRequestHeaders(request);
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe('INVALID_CONTENT_TYPE');
      });

      test('should allow custom Content-Types', () => {
        const request = createRequest('POST', {
          'content-type': 'text/plain',
        });
        const result = validateRequestHeaders(request, {
          allowedContentTypes: ['text/plain'],
        });
        expect(result.valid).toBe(true);
      });

      test('should skip Content-Type check for GET', () => {
        const request = createRequest('GET', {});
        const result = validateRequestHeaders(request);
        expect(result.valid).toBe(true);
      });
    });

    describe('Content-Length validation', () => {
      test('should accept valid Content-Length', () => {
        const request = createRequest('POST', {
          'content-type': 'application/json',
          'content-length': '100',
        });
        const result = validateRequestHeaders(request);
        expect(result.valid).toBe(true);
      });

      test('should reject Content-Length exceeding limit', () => {
        const request = createRequest('POST', {
          'content-type': 'application/json',
          'content-length': String(INPUT_LIMITS.maxRequestBodySize + 1),
        });
        const result = validateRequestHeaders(request);
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe('PAYLOAD_TOO_LARGE');
      });

      test('should reject invalid Content-Length', () => {
        const request = createRequest('POST', {
          'content-type': 'application/json',
          'content-length': 'not-a-number',
        });
        const result = validateRequestHeaders(request);
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe('INVALID_CONTENT_LENGTH');
      });

      test('should allow requests without Content-Length when not required', () => {
        const request = createRequest('POST', {
          'content-type': 'application/json',
        });
        const result = validateRequestHeaders(request, {
          requireContentLength: false,
        });
        expect(result.valid).toBe(true);
      });

      test('should reject requests without Content-Length when required', () => {
        const request = createRequest('POST', {
          'content-type': 'application/json',
        });
        const result = validateRequestHeaders(request, {
          requireContentLength: true,
        });
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe('MISSING_CONTENT_LENGTH');
      });

      test('should use custom max body size', () => {
        const request = createRequest('POST', {
          'content-type': 'application/json',
          'content-length': '500',
        });
        const result = validateRequestHeaders(request, {
          maxBodySize: 100,
        });
        expect(result.valid).toBe(false);
        expect(result.errorCode).toBe('PAYLOAD_TOO_LARGE');
      });
    });
  });

  describe('safeParseJSON', () => {
    function createRequestWithBody(body: string): NextRequest {
      return new NextRequest('http://localhost:3000/api/validate', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body,
      });
    }

    test('should parse valid JSON', async () => {
      const request = createRequestWithBody('{"email": "test@example.com"}');
      const result = await safeParseJSON(request);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ email: 'test@example.com' });
      }
    });

    test('should reject invalid JSON', async () => {
      const request = createRequestWithBody('not valid json');
      const result = await safeParseJSON(request);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errorCode).toBe('INVALID_JSON');
      }
    });

    test('should reject empty body', async () => {
      const request = createRequestWithBody('');
      const result = await safeParseJSON(request);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errorCode).toBe('EMPTY_BODY');
      }
    });

    test('should reject whitespace-only body', async () => {
      const request = createRequestWithBody('   ');
      const result = await safeParseJSON(request);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errorCode).toBe('EMPTY_BODY');
      }
    });

    test('should reject body exceeding size limit', async () => {
      const largeBody = JSON.stringify({ data: 'a'.repeat(1000) });
      const request = createRequestWithBody(largeBody);
      const result = await safeParseJSON(request, 100);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errorCode).toBe('PAYLOAD_TOO_LARGE');
      }
    });

    test('should handle various JSON types', async () => {
      // Array
      const arrayRequest = createRequestWithBody('["a", "b", "c"]');
      const arrayResult = await safeParseJSON(arrayRequest);
      expect(arrayResult.success).toBe(true);
      if (arrayResult.success) {
        expect(arrayResult.data).toEqual(['a', 'b', 'c']);
      }

      // Number
      const numberRequest = createRequestWithBody('123');
      const numberResult = await safeParseJSON(numberRequest);
      expect(numberResult.success).toBe(true);
      if (numberResult.success) {
        expect(numberResult.data).toBe(123);
      }

      // Boolean
      const boolRequest = createRequestWithBody('true');
      const boolResult = await safeParseJSON(boolRequest);
      expect(boolResult.success).toBe(true);
      if (boolResult.success) {
        expect(boolResult.data).toBe(true);
      }

      // Null
      const nullRequest = createRequestWithBody('null');
      const nullResult = await safeParseJSON(nullRequest);
      expect(nullResult.success).toBe(true);
      if (nullResult.success) {
        expect(nullResult.data).toBe(null);
      }
    });
  });

  describe('createValidationErrorResponse', () => {
    test('should create error response with correct status', () => {
      const response = createValidationErrorResponse(
        'Test error',
        'TEST_ERROR',
        400
      );
      expect(response.status).toBe(400);
    });

    test('should create error response with default status', () => {
      const response = createValidationErrorResponse('Test error', 'TEST_ERROR');
      expect(response.status).toBe(400);
    });

    test('should include error and code in body', async () => {
      const response = createValidationErrorResponse('Test error', 'TEST_ERROR');
      const body = await response.json();
      expect(body.error).toBe('Test error');
      expect(body.code).toBe('TEST_ERROR');
    });

    test('should include custom headers', async () => {
      const response = createValidationErrorResponse(
        'Test error',
        'TEST_ERROR',
        400,
        { 'X-Custom-Header': 'custom-value' }
      );
      expect(response.headers.get('X-Custom-Header')).toBe('custom-value');
    });
  });
});
