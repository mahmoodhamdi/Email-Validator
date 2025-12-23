/**
 * Custom error classes and error handling utilities.
 * Provides standardized error handling across the application.
 */

import { NextResponse } from 'next/server';

/**
 * HTTP status codes used in the application.
 */
export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;

/**
 * Base error class for validation-related errors.
 */
export class ValidationError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  /**
   * Create a new ValidationError.
   *
   * @param message - Human-readable error message
   * @param code - Machine-readable error code
   * @param statusCode - HTTP status code (default: 400)
   */
  constructor(message: string, code: string = 'VALIDATION_ERROR', statusCode: number = HTTP_STATUS.BAD_REQUEST) {
    super(message);
    this.name = 'ValidationError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Error class for rate limiting errors.
 */
export class RateLimitError extends Error {
  public readonly statusCode: number = HTTP_STATUS.TOO_MANY_REQUESTS;
  public readonly code: string = 'RATE_LIMIT_EXCEEDED';
  public readonly retryAfter: number;

  /**
   * Create a new RateLimitError.
   *
   * @param message - Human-readable error message
   * @param retryAfter - Seconds until the client can retry
   */
  constructor(message: string = 'Rate limit exceeded', retryAfter: number = 60) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

/**
 * Error class for parsing errors.
 */
export class ParseError extends Error {
  public readonly statusCode: number = HTTP_STATUS.BAD_REQUEST;
  public readonly code: string = 'PARSE_ERROR';

  /**
   * Create a new ParseError.
   *
   * @param message - Human-readable error message
   */
  constructor(message: string = 'Failed to parse request') {
    super(message);
    this.name = 'ParseError';
  }
}

/**
 * Error response structure for API responses.
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  retryAfter?: number;
}

/**
 * Create a standardized error response.
 *
 * @param error - Error message or Error object
 * @param statusCode - HTTP status code
 * @param headers - Optional headers to include
 * @returns NextResponse with error JSON
 */
export function createErrorResponse(
  error: string | Error,
  statusCode: number = HTTP_STATUS.BAD_REQUEST,
  headers?: HeadersInit
): NextResponse<ErrorResponse> {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorCode = error instanceof ValidationError || error instanceof RateLimitError
    ? error.code
    : undefined;

  const body: ErrorResponse = {
    error: errorMessage,
  };

  if (errorCode) {
    body.code = errorCode;
  }

  if (error instanceof RateLimitError) {
    body.retryAfter = error.retryAfter;
  }

  return NextResponse.json(body, {
    status: statusCode,
    headers,
  });
}

/**
 * Handle an error and create an appropriate response.
 * Automatically determines the status code based on error type.
 *
 * @param error - The error to handle
 * @param headers - Optional headers to include
 * @returns NextResponse with error JSON
 */
export function handleError(
  error: unknown,
  headers?: HeadersInit
): NextResponse<ErrorResponse> {
  // Handle known error types
  if (error instanceof RateLimitError) {
    return createErrorResponse(error, error.statusCode, headers);
  }

  if (error instanceof ValidationError) {
    return createErrorResponse(error, error.statusCode, headers);
  }

  if (error instanceof ParseError) {
    return createErrorResponse(error, error.statusCode, headers);
  }

  // Handle generic errors
  if (error instanceof Error) {
    console.error('Unhandled error:', error);
    return createErrorResponse(
      'Internal server error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      headers
    );
  }

  // Handle unknown error types
  console.error('Unknown error:', error);
  return createErrorResponse(
    'An unexpected error occurred',
    HTTP_STATUS.INTERNAL_SERVER_ERROR,
    headers
  );
}

/**
 * Type guard to check if an error is a ValidationError.
 *
 * @param error - The error to check
 * @returns true if the error is a ValidationError
 */
export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

/**
 * Type guard to check if an error is a RateLimitError.
 *
 * @param error - The error to check
 * @returns true if the error is a RateLimitError
 */
export function isRateLimitError(error: unknown): error is RateLimitError {
  return error instanceof RateLimitError;
}
