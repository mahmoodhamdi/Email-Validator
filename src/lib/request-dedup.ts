/**
 * Request deduplication for concurrent validation requests.
 * Prevents redundant API calls when the same email is validated multiple times simultaneously.
 */

import type { ValidationResult } from '@/types/email';

/**
 * Map of pending validation requests.
 * Key is the normalized email, value is the pending promise.
 */
const pendingRequests = new Map<string, Promise<ValidationResult>>();

/**
 * Deduplicate concurrent validation requests for the same email.
 *
 * If a request for the same email is already in progress, this returns
 * the existing promise instead of starting a new validation.
 *
 * @param email - The email to validate
 * @param validateFn - The validation function to call
 * @returns The validation result
 *
 * @example
 * ```typescript
 * // These concurrent calls will only trigger one actual validation
 * const [result1, result2] = await Promise.all([
 *   deduplicatedValidate('test@example.com', validateEmail),
 *   deduplicatedValidate('test@example.com', validateEmail),
 * ]);
 * ```
 */
export async function deduplicatedValidate(
  email: string,
  validateFn: (email: string) => Promise<ValidationResult>
): Promise<ValidationResult> {
  const normalizedEmail = email.toLowerCase().trim();

  // Check if a request for this email is already pending
  const pendingRequest = pendingRequests.get(normalizedEmail);
  if (pendingRequest) {
    return pendingRequest;
  }

  // Create a new request promise
  const requestPromise = validateFn(email).finally(() => {
    // Clean up after the request completes (success or failure)
    pendingRequests.delete(normalizedEmail);
  });

  // Store the pending request
  pendingRequests.set(normalizedEmail, requestPromise);

  return requestPromise;
}

/**
 * Get the number of currently pending requests.
 * Useful for monitoring and debugging.
 */
export function getPendingRequestCount(): number {
  return pendingRequests.size;
}

/**
 * Check if a request for a specific email is pending.
 *
 * @param email - The email to check
 * @returns true if a request is currently pending
 */
export function isRequestPending(email: string): boolean {
  const normalizedEmail = email.toLowerCase().trim();
  return pendingRequests.has(normalizedEmail);
}

/**
 * Clear all pending requests.
 * Use with caution - primarily for testing purposes.
 */
export function clearPendingRequests(): void {
  pendingRequests.clear();
}
