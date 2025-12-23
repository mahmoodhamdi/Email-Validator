/**
 * Input sanitization utilities for API endpoints.
 * Provides protection against XSS, injection attacks, and malformed input.
 */

import { MAX_EMAIL_LENGTH, RATE_LIMITS } from './constants';

/**
 * Sanitize a single email input.
 * Removes potentially dangerous characters and normalizes the input.
 *
 * @param email - Raw email input from user
 * @returns Sanitized email string
 */
export function sanitizeEmail(email: unknown): string {
  // Ensure input is a string
  if (typeof email !== 'string') {
    return '';
  }

  // Trim whitespace
  let sanitized = email.trim();

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Remove control characters except for standard whitespace
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Remove HTML tags (basic XSS prevention)
  sanitized = sanitized.replace(/<[^>]*>/g, '');

  // Remove potential script injection patterns
  sanitized = sanitized.replace(/javascript:/gi, '');
  sanitized = sanitized.replace(/data:/gi, '');
  sanitized = sanitized.replace(/vbscript:/gi, '');

  // Normalize unicode to prevent homograph attacks
  // Convert to NFC (Canonical Decomposition, followed by Canonical Composition)
  try {
    sanitized = sanitized.normalize('NFC');
  } catch {
    // If normalization fails, continue with original
  }

  // Enforce maximum length
  if (sanitized.length > MAX_EMAIL_LENGTH) {
    sanitized = sanitized.slice(0, MAX_EMAIL_LENGTH);
  }

  // Convert to lowercase for consistency
  sanitized = sanitized.toLowerCase();

  return sanitized;
}

/**
 * Sanitize an array of email inputs.
 *
 * @param emails - Raw email array from user
 * @param maxSize - Maximum number of emails to process
 * @returns Object containing sanitized emails and any removed duplicates count
 */
export function sanitizeEmailArray(
  emails: unknown,
  maxSize: number = RATE_LIMITS.maxBulkSize
): { emails: string[]; duplicatesRemoved: number; invalidRemoved: number } {
  // Ensure input is an array
  if (!Array.isArray(emails)) {
    return { emails: [], duplicatesRemoved: 0, invalidRemoved: 0 };
  }

  const seen = new Set<string>();
  const sanitized: string[] = [];
  let duplicatesRemoved = 0;
  let invalidRemoved = 0;

  for (const email of emails) {
    // Skip if we've reached the max size
    if (sanitized.length >= maxSize) {
      break;
    }

    // Sanitize individual email
    const clean = sanitizeEmail(email);

    // Skip empty strings
    if (!clean) {
      invalidRemoved++;
      continue;
    }

    // Skip if it doesn't look like an email (basic check)
    if (!clean.includes('@')) {
      invalidRemoved++;
      continue;
    }

    // Skip duplicates
    if (seen.has(clean)) {
      duplicatesRemoved++;
      continue;
    }

    seen.add(clean);
    sanitized.push(clean);
  }

  return { emails: sanitized, duplicatesRemoved, invalidRemoved };
}

/**
 * Escape HTML special characters to prevent XSS in responses.
 *
 * @param str - String to escape
 * @returns HTML-escaped string
 */
export function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return str.replace(/[&<>"'/]/g, (char) => htmlEscapes[char] || char);
}

/**
 * Validate that a value is a non-empty string.
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate that a value is a valid array.
 */
export function isValidArray(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0;
}
