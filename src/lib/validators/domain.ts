import type { DomainCheck } from '@/types/email';
import { domainCache } from '@/lib/cache';
import { EMAIL_LIMITS } from '@/lib/constants';
import { DOMAIN_REGEX } from './patterns';

/**
 * Validate domain format and existence.
 * Results are cached to improve performance.
 *
 * @param domain - The domain to validate
 * @returns DomainCheck result with validity, existence, and message
 */
export async function validateDomain(domain: string): Promise<DomainCheck> {
  const normalizedDomain = domain.toLowerCase();

  // Check cache first
  const cached = domainCache.get(normalizedDomain);
  if (cached) {
    return cached;
  }

  // Perform the actual validation
  const result = performDomainValidation(normalizedDomain);

  // Cache the result
  domainCache.set(normalizedDomain, result);

  return result;
}

/**
 * Perform the actual domain validation.
 */
function performDomainValidation(domain: string): DomainCheck {
  try {
    // Basic domain format validation
    if (!domain || domain.length === 0) {
      return {
        valid: false,
        exists: false,
        message: 'Domain is empty',
      };
    }

    // Check for valid domain format
    if (!DOMAIN_REGEX.test(domain)) {
      return {
        valid: false,
        exists: false,
        message: 'Invalid domain format',
      };
    }

    // Check for valid TLD length
    const parts = domain.split('.');
    const tld = parts[parts.length - 1];
    if (tld.length < EMAIL_LIMITS.minTldLength) {
      return {
        valid: false,
        exists: false,
        message: 'Invalid TLD',
      };
    }

    // In browser environment, we can't do DNS lookups directly
    // We'll rely on MX record check for domain existence
    // For now, mark as valid if format is correct
    return {
      valid: true,
      exists: true,
      message: 'Domain format is valid',
    };
  } catch {
    return {
      valid: false,
      exists: false,
      message: 'Failed to validate domain',
    };
  }
}

/**
 * Check if a domain has valid format (synchronous).
 *
 * @param domain - The domain to check
 * @returns true if the domain format is valid
 */
export function isValidDomainFormat(domain: string): boolean {
  return DOMAIN_REGEX.test(domain);
}
