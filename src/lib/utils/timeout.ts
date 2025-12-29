/**
 * Timeout utilities for async operations.
 * Provides timeout wrappers and error handling.
 */

/**
 * Error thrown when an operation times out.
 */
export class TimeoutError extends Error {
  public readonly timeoutMs: number;

  constructor(message: string, timeoutMs: number) {
    super(message);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;
  }
}

/**
 * Options for withTimeout function.
 */
export interface TimeoutOptions<T> {
  /** Timeout in milliseconds */
  timeoutMs: number;
  /** Optional fallback value to return on timeout instead of throwing */
  fallback?: T;
  /** Custom error message */
  errorMessage?: string;
  /** AbortController to use for cancellation */
  abortController?: AbortController;
}

/**
 * Wrap a promise with a timeout.
 *
 * @param promise - The promise to wrap
 * @param options - Timeout options
 * @returns The promise result or fallback value on timeout
 * @throws TimeoutError if timeout occurs and no fallback is provided
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  options: TimeoutOptions<T>
): Promise<T> {
  const { timeoutMs, fallback, errorMessage, abortController } = options;
  const controller = abortController || new AbortController();

  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      controller.abort();
      reject(new TimeoutError(
        errorMessage || `Operation timed out after ${timeoutMs}ms`,
        timeoutMs
      ));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);

    if (error instanceof TimeoutError && fallback !== undefined) {
      return fallback;
    }

    throw error;
  }
}

/**
 * Create a fetch request with timeout support.
 *
 * @param url - The URL to fetch
 * @param init - Fetch init options
 * @param timeoutMs - Timeout in milliseconds
 * @returns Fetch response
 * @throws TimeoutError if the request times out
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();

  const response = await withTimeout(
    fetch(url, {
      ...init,
      signal: controller.signal,
    }),
    {
      timeoutMs,
      abortController: controller,
      errorMessage: `Request to ${url} timed out after ${timeoutMs}ms`,
    }
  );

  return response;
}

/**
 * Check if an error is a TimeoutError.
 */
export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError;
}

/**
 * Check if an error is an AbortError (from AbortController).
 */
export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}
