/**
 * Reputation Validator
 *
 * Wrapper for domain reputation checks to be used
 * in the main validation pipeline.
 */

import { checkDomainReputation, type ReputationResult } from '../reputation';

/**
 * Result of reputation check
 */
export interface ReputationCheckResult {
  /** Whether the check was performed */
  checked: boolean;
  /** Reputation details (if checked) */
  reputation?: ReputationResult;
  /** Human-readable message */
  message: string;
}

/**
 * Options for reputation check
 */
export interface ReputationCheckOptions {
  /** Whether to enable reputation check (default: true) */
  enabled?: boolean;
  /** Timeout in milliseconds (default: 15000) */
  timeout?: number;
}

/**
 * Check domain reputation
 *
 * @param domain - Domain to check
 * @param options - Check options
 * @returns Reputation check result
 */
export async function checkReputation(
  domain: string,
  options: ReputationCheckOptions = {}
): Promise<ReputationCheckResult> {
  const { enabled = true, timeout = 15000 } = options;

  if (!enabled) {
    return {
      checked: false,
      message: 'Reputation check disabled',
    };
  }

  if (!domain) {
    return {
      checked: false,
      message: 'No domain provided',
    };
  }

  try {
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Reputation check timed out')), timeout);
    });

    // Race between reputation check and timeout
    const reputation = await Promise.race([
      checkDomainReputation(domain),
      timeoutPromise,
    ]);

    return {
      checked: true,
      reputation,
      message: reputation.summary,
    };
  } catch (error) {
    return {
      checked: false,
      message: error instanceof Error ? error.message : 'Reputation check failed',
    };
  }
}
