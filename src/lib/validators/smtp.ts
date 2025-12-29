/**
 * SMTP Validator
 *
 * Validates email addresses by checking if the mailbox exists
 * through SMTP verification.
 */

import { verifySMTP, getSMTPCacheStats, clearSMTPCache } from '../smtp/client';
import type { SMTPCheckResult } from '../smtp/types';

export type { SMTPCheckResult };

/**
 * Options for SMTP check
 */
export interface SMTPCheckOptions {
  /** Whether SMTP check is enabled */
  enabled?: boolean;
  /** Timeout in milliseconds */
  timeout?: number;
}

/**
 * Check if an email mailbox exists via SMTP verification
 *
 * @param email - Email address to verify
 * @param mxRecords - List of MX record hostnames
 * @param options - Check options
 * @returns SMTP check result
 */
export async function checkSMTP(
  email: string,
  mxRecords: string[],
  options: SMTPCheckOptions = {}
): Promise<SMTPCheckResult> {
  const { enabled = true, timeout = 10000 } = options;

  // Return early if disabled
  if (!enabled) {
    return {
      checked: false,
      exists: null,
      catchAll: false,
      greylisted: false,
      message: 'SMTP verification disabled',
    };
  }

  // Require MX records
  if (!mxRecords || mxRecords.length === 0) {
    return {
      checked: false,
      exists: null,
      catchAll: false,
      greylisted: false,
      message: 'No MX records available',
    };
  }

  try {
    const result = await verifySMTP(email, mxRecords, { timeout });

    return {
      checked: true,
      exists: result.exists,
      catchAll: result.catchAll,
      greylisted: result.greylisted,
      message: result.message,
      responseTime: result.responseTime,
    };
  } catch (error) {
    return {
      checked: false,
      exists: null,
      catchAll: false,
      greylisted: false,
      message: error instanceof Error ? error.message : 'SMTP check failed',
    };
  }
}

/**
 * Get SMTP cache statistics
 */
export { getSMTPCacheStats, clearSMTPCache };
