/**
 * Shared factory for creating validation result objects.
 * Prevents duplication of the failed/error result structure across modules.
 */

import type { ValidationResult, DeliverabilityStatus } from '@/types/email';

/**
 * Create a failed validation result with all checks set to skipped/false.
 *
 * @param email - The email address
 * @param reason - Human-readable failure reason
 * @param deliverability - Deliverability status (defaults to 'unknown')
 * @returns A ValidationResult representing a failed validation
 */
export function createFailedResult(
  email: string,
  reason: string,
  deliverability: DeliverabilityStatus = 'unknown'
): ValidationResult {
  return {
    email: email.trim(),
    isValid: false,
    score: 0,
    checks: {
      syntax: { valid: false, message: reason },
      domain: { valid: false, exists: false, message: 'Skipped' },
      mx: { valid: false, records: [], message: 'Skipped' },
      disposable: { isDisposable: false, message: 'Skipped' },
      roleBased: { isRoleBased: false, role: null },
      freeProvider: { isFree: false, provider: null },
      typo: { hasTypo: false, suggestion: null },
      blacklisted: { isBlacklisted: false, lists: [] },
      catchAll: { isCatchAll: false },
    },
    deliverability,
    risk: 'high',
    timestamp: new Date().toISOString(),
  };
}
