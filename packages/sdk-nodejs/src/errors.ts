/**
 * Email Validator SDK Error Classes
 */

export class EmailValidatorError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'EmailValidatorError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends EmailValidatorError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends EmailValidatorError {
  constructor(message: string = 'Invalid or missing API key') {
    super(message, 'AUTHENTICATION_ERROR', 401);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends EmailValidatorError {
  constructor(public readonly retryAfter?: number) {
    super('Rate limit exceeded', 'RATE_LIMIT_ERROR', 429);
    this.name = 'RateLimitError';
  }
}

export class NetworkError extends EmailValidatorError {
  constructor(
    message: string,
    public readonly cause?: Error
  ) {
    super(message, 'NETWORK_ERROR');
    this.name = 'NetworkError';
  }
}

export class TimeoutError extends EmailValidatorError {
  constructor(timeout: number) {
    super(`Request timed out after ${timeout}ms`, 'TIMEOUT_ERROR');
    this.name = 'TimeoutError';
  }
}
