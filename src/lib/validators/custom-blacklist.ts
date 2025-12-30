/**
 * Custom Blacklist Validator
 *
 * Wrapper for custom blacklist checking in the validation pipeline.
 */

import { checkAgainstBlacklist, type Blacklist, type BlacklistCheckResult } from '../blacklist';

/**
 * Options for custom blacklist check
 */
export interface CustomBlacklistOptions {
  /** Whether to enable the check (default: true) */
  enabled?: boolean;
}

/**
 * Result of custom blacklist check
 */
export interface CustomBlacklistCheckResult {
  /** Whether the check was performed */
  checked: boolean;
  /** Blacklist check result (if checked) */
  result?: BlacklistCheckResult;
  /** Human-readable message */
  message: string;
}

/**
 * Check email against custom blacklists
 *
 * @param email - Email address to check
 * @param blacklists - Array of blacklists to check against
 * @param options - Check options
 * @returns Custom blacklist check result
 */
export function checkCustomBlacklist(
  email: string,
  blacklists: Blacklist[],
  options: CustomBlacklistOptions = {}
): CustomBlacklistCheckResult {
  const { enabled = true } = options;

  if (!enabled) {
    return {
      checked: false,
      message: 'Custom blacklist check disabled',
    };
  }

  if (!blacklists || blacklists.length === 0) {
    return {
      checked: false,
      message: 'No custom blacklists configured',
    };
  }

  if (!email) {
    return {
      checked: false,
      message: 'No email provided',
    };
  }

  const result = checkAgainstBlacklist(email, blacklists);

  return {
    checked: true,
    result,
    message: result.message,
  };
}

export type { Blacklist, BlacklistCheckResult };
