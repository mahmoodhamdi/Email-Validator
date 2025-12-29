/**
 * Request validation middleware for API endpoints.
 * Validates Content-Type, Content-Length, and other security checks.
 */

import { NextRequest, NextResponse } from 'next/server';
import { INPUT_LIMITS } from '@/lib/constants';
import { HTTP_STATUS } from '@/lib/errors';

/**
 * Validation result returned by request validators.
 */
export interface RequestValidationResult {
  valid: boolean;
  error?: string;
  errorCode?: string;
}

/**
 * Options for request validation.
 */
export interface RequestValidationOptions {
  /** Expected content types (default: application/json) */
  allowedContentTypes?: string[];
  /** Maximum request body size in bytes */
  maxBodySize?: number;
  /** Whether to require Content-Length header */
  requireContentLength?: boolean;
}

/**
 * Default validation options.
 */
const DEFAULT_OPTIONS: Required<RequestValidationOptions> = {
  allowedContentTypes: ['application/json'],
  maxBodySize: INPUT_LIMITS.maxRequestBodySize,
  requireContentLength: false,
};

/**
 * Validate request headers before processing body.
 *
 * @param request - The incoming request
 * @param options - Validation options
 * @returns Validation result
 */
export function validateRequestHeaders(
  request: NextRequest,
  options: RequestValidationOptions = {}
): RequestValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Validate Content-Type for POST/PUT/PATCH requests
  if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
    const contentType = request.headers.get('content-type');

    if (!contentType) {
      return {
        valid: false,
        error: 'Content-Type header is required',
        errorCode: 'MISSING_CONTENT_TYPE',
      };
    }

    // Extract main content type (ignore charset and other params)
    const mainType = contentType.split(';')[0].trim().toLowerCase();

    const isAllowed = opts.allowedContentTypes.some(
      (allowed) => mainType === allowed.toLowerCase()
    );

    if (!isAllowed) {
      return {
        valid: false,
        error: `Invalid Content-Type. Expected: ${opts.allowedContentTypes.join(' or ')}`,
        errorCode: 'INVALID_CONTENT_TYPE',
      };
    }
  }

  // Validate Content-Length
  const contentLength = request.headers.get('content-length');

  if (opts.requireContentLength && !contentLength) {
    return {
      valid: false,
      error: 'Content-Length header is required',
      errorCode: 'MISSING_CONTENT_LENGTH',
    };
  }

  if (contentLength) {
    const size = parseInt(contentLength, 10);

    if (isNaN(size) || size < 0) {
      return {
        valid: false,
        error: 'Invalid Content-Length header',
        errorCode: 'INVALID_CONTENT_LENGTH',
      };
    }

    if (size > opts.maxBodySize) {
      return {
        valid: false,
        error: `Request body too large. Maximum size: ${formatBytes(opts.maxBodySize)}`,
        errorCode: 'PAYLOAD_TOO_LARGE',
      };
    }
  }

  return { valid: true };
}

/**
 * Safely parse JSON body with size limit check.
 *
 * @param request - The incoming request
 * @param maxSize - Maximum body size in bytes
 * @returns Parsed body or error
 */
export async function safeParseJSON(
  request: NextRequest,
  maxSize: number = INPUT_LIMITS.maxRequestBodySize
): Promise<{ success: true; data: unknown } | { success: false; error: string; errorCode: string }> {
  try {
    // Get the request body as text first to check size
    const text = await request.text();

    // Check actual body size
    const byteSize = new TextEncoder().encode(text).length;
    if (byteSize > maxSize) {
      return {
        success: false,
        error: `Request body too large. Maximum size: ${formatBytes(maxSize)}`,
        errorCode: 'PAYLOAD_TOO_LARGE',
      };
    }

    // Parse JSON
    if (!text.trim()) {
      return {
        success: false,
        error: 'Request body is empty',
        errorCode: 'EMPTY_BODY',
      };
    }

    const data = JSON.parse(text);
    return { success: true, data };
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: 'Invalid JSON in request body',
        errorCode: 'INVALID_JSON',
      };
    }

    return {
      success: false,
      error: 'Failed to read request body',
      errorCode: 'READ_ERROR',
    };
  }
}

/**
 * Create a validation error response.
 */
export function createValidationErrorResponse(
  error: string,
  errorCode: string,
  status: number = HTTP_STATUS.BAD_REQUEST,
  headers?: HeadersInit
): NextResponse {
  return NextResponse.json(
    {
      error,
      code: errorCode,
    },
    {
      status,
      headers,
    }
  );
}

/**
 * Higher-order function to wrap API route handlers with request validation.
 *
 * @param handler - The route handler function
 * @param options - Validation options
 * @returns Wrapped handler with validation
 */
export function withRequestValidation<T extends NextRequest>(
  handler: (request: T, body: unknown) => Promise<NextResponse> | NextResponse,
  options: RequestValidationOptions = {}
): (request: T) => Promise<NextResponse> {
  return async (request: T): Promise<NextResponse> => {
    // Validate headers
    const headerValidation = validateRequestHeaders(request, options);
    if (!headerValidation.valid) {
      const status = headerValidation.errorCode === 'PAYLOAD_TOO_LARGE'
        ? HTTP_STATUS.PAYLOAD_TOO_LARGE
        : HTTP_STATUS.BAD_REQUEST;

      return createValidationErrorResponse(
        headerValidation.error || 'Invalid request',
        headerValidation.errorCode || 'VALIDATION_ERROR',
        status
      );
    }

    // Parse body for methods that have one
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const opts = { ...DEFAULT_OPTIONS, ...options };
      const parseResult = await safeParseJSON(request, opts.maxBodySize);

      if (!parseResult.success) {
        const status = parseResult.errorCode === 'PAYLOAD_TOO_LARGE'
          ? HTTP_STATUS.PAYLOAD_TOO_LARGE
          : HTTP_STATUS.BAD_REQUEST;

        return createValidationErrorResponse(
          parseResult.error,
          parseResult.errorCode,
          status
        );
      }

      return handler(request, parseResult.data);
    }

    return handler(request, null);
  };
}

/**
 * Format bytes to human-readable string.
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
