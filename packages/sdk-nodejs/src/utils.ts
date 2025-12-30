/**
 * Email Validator SDK Utilities
 */

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
export function getBackoffDelay(attempt: number, baseDelay: number): number {
  return baseDelay * Math.pow(2, attempt) + Math.random() * 100;
}

/**
 * Check if error is retryable
 */
export function isRetryableError(statusCode?: number): boolean {
  if (!statusCode) {
    return true;
  } // Network errors are retryable
  return statusCode >= 500 || statusCode === 429 || statusCode === 408;
}

/**
 * Validate email format (basic)
 */
export function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
