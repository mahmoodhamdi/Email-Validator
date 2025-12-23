/**
 * Centralized regex patterns for email and domain validation.
 * These patterns are used across multiple validators for consistency.
 */

/**
 * RFC 5322 compliant email regex pattern.
 * This is a comprehensive pattern that validates email addresses according to the RFC 5322 standard.
 * It supports:
 * - Standard email addresses (user@domain.com)
 * - Quoted local parts ("user name"@domain.com)
 * - IP address domains (user@[192.168.1.1])
 * - Special characters in local part
 */
export const EMAIL_REGEX =
  /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/i;

/**
 * Simple email regex pattern for basic validation.
 * This is a lightweight pattern for quick checks:
 * - Non-whitespace characters before @
 * - Non-whitespace characters after @
 * - At least one dot in the domain
 */
export const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Domain format validation regex.
 * Validates domain names according to RFC standards:
 * - Alphanumeric characters and hyphens
 * - Cannot start or end with hyphen
 * - Multiple labels separated by dots
 * - TLD must be at least 2 characters
 */
export const DOMAIN_REGEX =
  /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

/**
 * Check if an email matches the RFC 5322 pattern.
 *
 * @param email - The email address to validate
 * @returns true if the email matches the RFC 5322 pattern
 */
export function isValidEmailFormat(email: string): boolean {
  return EMAIL_REGEX.test(email);
}

/**
 * Check if an email matches the simple email pattern.
 *
 * @param email - The email address to validate
 * @returns true if the email has basic valid structure
 */
export function isSimpleEmailFormat(email: string): boolean {
  return SIMPLE_EMAIL_REGEX.test(email);
}

/**
 * Check if a domain matches the valid domain pattern.
 *
 * @param domain - The domain to validate
 * @returns true if the domain format is valid
 */
export function isValidDomainPattern(domain: string): boolean {
  return DOMAIN_REGEX.test(domain);
}
