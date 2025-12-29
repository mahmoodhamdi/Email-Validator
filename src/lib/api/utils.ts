/**
 * Shared API utilities for consistent response handling across routes.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  handleError,
  RateLimitError,
  ParseError,
  ValidationError,
  RequestTimeoutError,
  HTTP_STATUS,
  createErrorResponse,
} from '@/lib/errors';
import { TimeoutError } from '@/lib/utils/timeout';

/**
 * Standard API success response structure.
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
  requestId?: string;
}

/**
 * Standard API error response structure.
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
  requestId?: string;
}

/**
 * Union type for all API responses.
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Create a standardized success response.
 */
export function jsonResponse<T>(
  data: T,
  status = 200,
  headers?: HeadersInit
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true as const,
      data,
      timestamp: new Date().toISOString(),
    },
    { status, headers }
  );
}

/**
 * Create a standardized error response with structured error.
 */
export function errorResponse(
  code: string,
  message: string,
  status = 400,
  details?: Record<string, unknown>,
  headers?: HeadersInit
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      success: false as const,
      error: {
        code,
        message,
        ...(details && { details }),
      },
      timestamp: new Date().toISOString(),
    },
    { status, headers }
  );
}

/**
 * Generate a unique request ID.
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Route handler type.
 */
type RouteHandler = (
  request: NextRequest,
  context?: { params?: Record<string, string> }
) => Promise<NextResponse>;

/**
 * Route handler context with request ID.
 */
export interface RouteContext {
  requestId: string;
  startTime: number;
}

/**
 * Options for the error handler wrapper.
 */
interface ErrorHandlerOptions {
  /** Custom headers to include in all responses */
  headers?: HeadersInit;
  /** Whether to log errors (default: true) */
  logErrors?: boolean;
}

/**
 * Wrap a route handler with standardized error handling.
 * Automatically:
 * - Adds request ID tracking
 * - Catches and formats all errors consistently
 * - Logs errors with context
 * - Preserves rate limit headers
 */
export function withErrorHandler(
  handler: RouteHandler,
  options: ErrorHandlerOptions = {}
): RouteHandler {
  const { headers: defaultHeaders = {}, logErrors = true } = options;

  return async (request: NextRequest, context?) => {
    const requestId = generateRequestId();
    const startTime = Date.now();

    // Add request ID to headers
    const addRequestIdHeader = (response: NextResponse): NextResponse => {
      response.headers.set('X-Request-ID', requestId);
      return response;
    };

    try {
      const response = await handler(request, context);
      return addRequestIdHeader(response);
    } catch (error) {
      // Log error with context
      if (logErrors) {
        const errorInfo = {
          requestId,
          path: request.nextUrl.pathname,
          method: request.method,
          duration: Date.now() - startTime,
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        };

        // Only log stack for unexpected errors
        if (
          !(error instanceof RateLimitError) &&
          !(error instanceof ParseError) &&
          !(error instanceof ValidationError)
        ) {
          console.error('API Error:', errorInfo);
        }
      }

      // Merge headers
      const mergedHeaders: HeadersInit = { ...defaultHeaders, 'X-Request-ID': requestId };

      // Handle known error types
      if (error instanceof RateLimitError) {
        return createErrorResponse(error, HTTP_STATUS.TOO_MANY_REQUESTS, mergedHeaders);
      }

      if (error instanceof ParseError || error instanceof ValidationError) {
        return createErrorResponse(error, HTTP_STATUS.BAD_REQUEST, mergedHeaders);
      }

      if (error instanceof TimeoutError) {
        return createErrorResponse(
          new RequestTimeoutError(error.message, error.timeoutMs),
          HTTP_STATUS.INTERNAL_SERVER_ERROR,
          mergedHeaders
        );
      }

      // Handle unknown errors
      return handleError(error, mergedHeaders);
    }
  };
}

/**
 * Parse JSON body from request with error handling.
 * @throws ParseError if JSON is invalid
 */
export async function parseJsonBody<T = unknown>(request: NextRequest): Promise<T> {
  try {
    return await request.json();
  } catch {
    throw new ParseError('Invalid JSON in request body');
  }
}

/**
 * Add CORS headers to a response.
 */
export function withCors(
  response: NextResponse,
  options: {
    origin?: string;
    methods?: string[];
    headers?: string[];
    credentials?: boolean;
  } = {}
): NextResponse {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'OPTIONS'],
    headers = ['Content-Type', 'Authorization'],
    credentials = false,
  } = options;

  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', methods.join(', '));
  response.headers.set('Access-Control-Allow-Headers', headers.join(', '));

  if (credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
}

/**
 * Measure request duration and add to response headers.
 */
export function withTiming(response: NextResponse, startTime: number): NextResponse {
  const duration = Date.now() - startTime;
  response.headers.set('X-Response-Time', `${duration}ms`);
  return response;
}
