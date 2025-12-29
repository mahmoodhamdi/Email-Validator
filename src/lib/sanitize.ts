/**
 * Input sanitization utilities for API endpoints.
 * Provides protection against XSS, injection attacks, and malformed input.
 */

import { EMAIL_LIMITS, INPUT_LIMITS, RATE_LIMITS } from './constants';

/**
 * Dangerous patterns that should be removed from input.
 * These patterns can be used for XSS or injection attacks.
 */
const DANGEROUS_PATTERNS = [
  // Script protocols
  /javascript\s*:/gi,
  /vbscript\s*:/gi,
  /data\s*:/gi,
  /file\s*:/gi,
  // Event handlers
  /on\w+\s*=/gi,
  // Expression
  /expression\s*\(/gi,
  // Import/export
  /@import/gi,
  // Binding
  /binding\s*:/gi,
  // Behavior
  /behavior\s*:/gi,
  // Mozbinding
  /-moz-binding/gi,
  // Base64 data URIs (potential payload carriers)
  /data:[^,]*;base64/gi,
];

/**
 * HTML tag pattern for stripping tags.
 */
const HTML_TAG_PATTERN = /<[^>]*>/g;

/**
 * Control character pattern (except standard whitespace).
 */
const CONTROL_CHAR_PATTERN = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Null byte pattern.
 */
const NULL_BYTE_PATTERN = /\0/g;

/**
 * Sanitize a single email input.
 * Removes potentially dangerous characters and normalizes the input.
 *
 * @param email - Raw email input from user
 * @returns Sanitized email string or empty string if invalid
 */
export function sanitizeEmail(email: unknown): string {
  // Ensure input is a string
  if (typeof email !== 'string') {
    return '';
  }

  // Early exit for empty strings
  if (!email.trim()) {
    return '';
  }

  let sanitized = email;

  // Remove null bytes first (critical security measure)
  sanitized = sanitized.replace(NULL_BYTE_PATTERN, '');

  // Remove control characters except for standard whitespace
  sanitized = sanitized.replace(CONTROL_CHAR_PATTERN, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  // Enforce maximum length early to prevent ReDoS
  if (sanitized.length > INPUT_LIMITS.maxEmailLength) {
    sanitized = sanitized.slice(0, INPUT_LIMITS.maxEmailLength);
  }

  // Remove HTML tags (basic XSS prevention)
  sanitized = sanitized.replace(HTML_TAG_PATTERN, '');

  // Remove all dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  // Normalize unicode to prevent homograph attacks
  // Convert to NFC (Canonical Decomposition, followed by Canonical Composition)
  try {
    sanitized = sanitized.normalize('NFC');
  } catch {
    // If normalization fails, continue with original
  }

  // Convert to lowercase for consistency
  sanitized = sanitized.toLowerCase();

  // Final trim after all processing
  sanitized = sanitized.trim();

  // Validate minimum length
  if (sanitized.length < INPUT_LIMITS.minEmailLength) {
    return '';
  }

  return sanitized;
}

/**
 * Sanitize text content (for bulk email textarea input).
 * Removes dangerous content while preserving newlines for email separation.
 *
 * @param text - Raw text input from textarea
 * @param maxSize - Maximum allowed size in bytes
 * @returns Sanitized text or null if input exceeds size limit
 */
export function sanitizeTextContent(
  text: unknown,
  maxSize: number = INPUT_LIMITS.maxTextareaSize
): string | null {
  if (typeof text !== 'string') {
    return null;
  }

  // Check size limit before processing
  const byteSize = new TextEncoder().encode(text).length;
  if (byteSize > maxSize) {
    return null;
  }

  let sanitized = text;

  // Remove null bytes
  sanitized = sanitized.replace(NULL_BYTE_PATTERN, '');

  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Remove HTML tags
  sanitized = sanitized.replace(HTML_TAG_PATTERN, '');

  // Remove dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

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

    // Skip empty strings (invalid input)
    if (!clean) {
      invalidRemoved++;
      continue;
    }

    // Skip if it doesn't look like an email (basic check)
    if (!clean.includes('@')) {
      invalidRemoved++;
      continue;
    }

    // Check email has valid structure (local@domain)
    const atIndex = clean.indexOf('@');
    const localPart = clean.slice(0, atIndex);
    const domainPart = clean.slice(atIndex + 1);

    if (!localPart || !domainPart || !domainPart.includes('.')) {
      invalidRemoved++;
      continue;
    }

    // Check local part length
    if (localPart.length > EMAIL_LIMITS.maxLocalPartLength) {
      invalidRemoved++;
      continue;
    }

    // Check domain length
    if (domainPart.length > EMAIL_LIMITS.maxDomainLength) {
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
 * Parse emails from text content (textarea or file).
 * Supports comma-separated, newline-separated, and mixed formats.
 *
 * @param text - Text content containing emails
 * @param maxEmails - Maximum number of emails to extract
 * @returns Array of parsed email strings
 */
export function parseEmailsFromText(
  text: string,
  maxEmails: number = INPUT_LIMITS.maxBulkEmails
): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  // Normalize line endings
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split by common delimiters (newlines, commas, semicolons)
  const parts = normalized.split(/[\n,;]+/);

  const emails: string[] = [];

  for (const part of parts) {
    if (emails.length >= maxEmails) {
      break;
    }

    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }

    // Extract email from common formats:
    // - Plain email: user@example.com
    // - Name <email>: John Doe <john@example.com>
    // - "Name" <email>: "John Doe" <john@example.com>
    // - email (name): user@example.com (John Doe)
    let email = trimmed;

    // Try to extract from angle brackets: <email>
    const angleMatch = trimmed.match(/<([^>]+)>/);
    if (angleMatch) {
      email = angleMatch[1];
    } else {
      // Try to extract email before parenthesis: email (name)
      const parenMatch = trimmed.match(/^([^\s(]+)/);
      if (parenMatch) {
        email = parenMatch[1];
      }
    }

    // Basic validation: must contain @ and have content on both sides
    if (email.includes('@')) {
      const atIndex = email.indexOf('@');
      if (atIndex > 0 && atIndex < email.length - 1) {
        emails.push(email.toLowerCase().trim());
      }
    }
  }

  return emails;
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
    '`': '&#x60;',
    '=': '&#x3D;',
  };

  return str.replace(/[&<>"'/`=]/g, (char) => htmlEscapes[char] || char);
}

/**
 * Sanitize a filename to prevent path traversal and other attacks.
 *
 * @param filename - Original filename
 * @returns Sanitized filename
 */
export function sanitizeFilename(filename: unknown): string {
  if (typeof filename !== 'string') {
    return 'file';
  }

  let sanitized = filename;

  // Remove null bytes
  sanitized = sanitized.replace(NULL_BYTE_PATTERN, '');

  // Remove path traversal attempts
  sanitized = sanitized.replace(/\.\./g, '');
  sanitized = sanitized.replace(/[/\\]/g, '');

  // Remove control characters
  sanitized = sanitized.replace(CONTROL_CHAR_PATTERN, '');

  // Keep only safe characters (alphanumeric, dash, underscore, dot)
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Ensure we have a valid filename before processing
  if (!sanitized || sanitized === '.' || sanitized === '..') {
    return 'file';
  }

  // Prevent hidden files
  if (sanitized.startsWith('.')) {
    sanitized = '_' + sanitized.slice(1);
  }

  // Check again after potential modification
  if (!sanitized || sanitized === '_') {
    return 'file';
  }

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.slice(sanitized.lastIndexOf('.'));
    sanitized = sanitized.slice(0, 255 - ext.length) + ext;
  }

  return sanitized;
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

/**
 * Validate Content-Type header.
 *
 * @param contentType - Content-Type header value
 * @param expected - Expected content type(s)
 * @returns True if content type matches
 */
export function isValidContentType(
  contentType: string | null,
  expected: string | string[]
): boolean {
  if (!contentType) {
    return false;
  }

  // Extract the main content type (ignore charset and other params)
  const mainType = contentType.split(';')[0].trim().toLowerCase();

  if (Array.isArray(expected)) {
    return expected.some((e) => mainType === e.toLowerCase());
  }

  return mainType === expected.toLowerCase();
}

/**
 * Check if request body size is within limits.
 *
 * @param contentLength - Content-Length header value
 * @param maxSize - Maximum allowed size
 * @returns True if within limits
 */
export function isWithinSizeLimit(
  contentLength: string | null,
  maxSize: number = INPUT_LIMITS.maxRequestBodySize
): boolean {
  if (!contentLength) {
    // No Content-Length header, we'll validate when reading
    return true;
  }

  const size = parseInt(contentLength, 10);
  if (isNaN(size)) {
    return false;
  }

  return size <= maxSize;
}
