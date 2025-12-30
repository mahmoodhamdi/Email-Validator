/**
 * Gravatar Validator
 *
 * Wrapper for Gravatar checks to be used in the main validation pipeline.
 */

import { checkGravatar, type GravatarCheckResult } from '../gravatar';

/**
 * Options for Gravatar check
 */
export interface GravatarCheckOptions {
  /** Whether to enable Gravatar check (default: true) */
  enabled?: boolean;
  /** Timeout in milliseconds (default: 5000) */
  timeout?: number;
}

/**
 * Check if email has a Gravatar profile
 *
 * @param email - Email address to check
 * @param options - Check options
 * @returns Gravatar check result
 */
export async function checkGravatarProfile(
  email: string,
  options: GravatarCheckOptions = {}
): Promise<GravatarCheckResult> {
  const { enabled = true, timeout = 5000 } = options;

  if (!enabled) {
    return {
      checked: false,
      message: 'Gravatar check disabled',
    };
  }

  if (!email) {
    return {
      checked: false,
      message: 'No email provided',
    };
  }

  try {
    // Create a timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Gravatar check timed out')), timeout);
    });

    // Race between Gravatar check and timeout
    const result = await Promise.race([checkGravatar(email), timeoutPromise]);

    return result;
  } catch (error) {
    return {
      checked: false,
      message: error instanceof Error ? error.message : 'Gravatar check failed',
    };
  }
}

export type { GravatarCheckResult };
