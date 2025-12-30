/**
 * Authentication Validator
 *
 * Wrapper for email authentication checks (SPF, DMARC, DKIM)
 * to be used in the main validation pipeline.
 */

import { checkEmailAuthentication, type AuthenticationResult } from '../auth';

/**
 * Result of authentication check
 */
export interface AuthCheckResult {
  /** Whether the check was performed */
  checked: boolean;
  /** Authentication details (if checked) */
  authentication?: AuthenticationResult;
  /** Human-readable message */
  message: string;
}

/**
 * Options for authentication check
 */
export interface AuthCheckOptions {
  /** Whether to enable authentication check (default: true) */
  enabled?: boolean;
  /** Timeout in milliseconds (default: 10000) */
  timeout?: number;
}

/**
 * Check email authentication records for a domain.
 *
 * @param domain - Domain to check
 * @param options - Check options
 * @returns Authentication check result
 */
export async function checkAuthentication(
  domain: string,
  options: AuthCheckOptions = {}
): Promise<AuthCheckResult> {
  const { enabled = true, timeout = 10000 } = options;

  if (!enabled) {
    return {
      checked: false,
      message: 'Authentication check disabled',
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
      setTimeout(() => reject(new Error('Authentication check timed out')), timeout);
    });

    // Race between authentication check and timeout
    const authentication = await Promise.race([
      checkEmailAuthentication(domain),
      timeoutPromise,
    ]);

    return {
      checked: true,
      authentication,
      message: authentication.summary,
    };
  } catch (error) {
    return {
      checked: false,
      message: error instanceof Error ? error.message : 'Authentication check failed',
    };
  }
}
