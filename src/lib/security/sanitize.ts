/**
 * Input sanitization utilities for API endpoints.
 * Prevents XSS and injection attacks.
 */

/**
 * Sanitize email input to prevent XSS
 */
export function sanitizeEmailInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Trim and limit length
  let sanitized = input.trim().slice(0, 254);

  // Remove control characters except for basic whitespace
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Encode HTML entities to prevent XSS
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

  return sanitized;
}

/**
 * Sanitize a plain string (for error messages, etc.)
 */
export function sanitizeString(input: string, maxLength: number = 500): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .trim()
    .slice(0, maxLength)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Validate that input looks like a plausible email (basic check before full validation)
 */
export function isPlausibleEmail(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }
  if (input.length < 3 || input.length > 254) {
    return false;
  }
  if (!input.includes('@')) {
    return false;
  }

  // Reject obvious XSS attempts
  if (/<script/i.test(input) || /javascript:/i.test(input) || /on\w+=/i.test(input)) {
    return false;
  }

  return true;
}
