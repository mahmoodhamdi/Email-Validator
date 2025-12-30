/**
 * Blacklist Checker
 *
 * Provides pattern matching for custom blacklists.
 */

import { BlacklistEntry, BlacklistCheckResult, Blacklist } from './types';

/**
 * Check if an email matches any blacklist entries
 *
 * @param email - Email address to check
 * @param blacklists - Array of blacklists to check against
 * @returns Blacklist check result
 */
export function checkAgainstBlacklist(
  email: string,
  blacklists: Blacklist[]
): BlacklistCheckResult {
  const normalizedEmail = email.toLowerCase().trim();
  const atIndex = normalizedEmail.lastIndexOf('@');

  if (atIndex === -1) {
    return {
      isBlacklisted: false,
      matchedEntries: [],
      message: 'Invalid email format',
    };
  }

  const domain = normalizedEmail.substring(atIndex + 1);
  const matchedEntries: BlacklistEntry[] = [];

  for (const blacklist of blacklists) {
    for (const entry of blacklist.entries) {
      if (!entry.isActive) {
        continue;
      }

      const matches = matchesEntry(normalizedEmail, domain, entry);
      if (matches) {
        matchedEntries.push(entry);
      }
    }
  }

  return {
    isBlacklisted: matchedEntries.length > 0,
    matchedEntries,
    message:
      matchedEntries.length > 0
        ? `Matched ${matchedEntries.length} blacklist rule(s)`
        : 'Not blacklisted',
  };
}

/**
 * Check if email/domain matches a blacklist entry
 */
function matchesEntry(
  email: string,
  domain: string,
  entry: BlacklistEntry
): boolean {
  const pattern = entry.pattern.toLowerCase();

  switch (entry.type) {
    case 'email':
      return email === pattern;

    case 'domain':
      // Match exact domain or subdomains
      return domain === pattern || domain.endsWith(`.${pattern}`);

    case 'pattern':
      // Match wildcard pattern against email or domain
      return matchesWildcard(email, pattern) || matchesWildcard(domain, pattern);

    default:
      return false;
  }
}

/**
 * Simple wildcard pattern matching
 * Supports * (any characters) and ? (single character)
 *
 * @param text - Text to match against
 * @param pattern - Wildcard pattern (* = any chars, ? = single char)
 * @returns Whether the text matches the pattern
 */
function matchesWildcard(text: string, pattern: string): boolean {
  // Convert wildcard pattern to regex
  const regexPattern = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
    .replace(/\*/g, '.*') // * = any characters
    .replace(/\?/g, '.'); // ? = single character

  const regex = new RegExp(`^${regexPattern}$`, 'i');
  return regex.test(text);
}

/**
 * Validate a blacklist pattern
 *
 * @param pattern - Pattern to validate
 * @param type - Type of pattern
 * @returns Validation result
 */
export function validatePattern(
  pattern: string,
  type: BlacklistEntry['type']
): { valid: boolean; error?: string } {
  if (!pattern || !pattern.trim()) {
    return { valid: false, error: 'Pattern cannot be empty' };
  }

  const normalized = pattern.trim().toLowerCase();

  switch (type) {
    case 'email':
      // Basic email format check
      if (!normalized.includes('@')) {
        return { valid: false, error: 'Email must contain @' };
      }
      if (normalized.split('@').length !== 2) {
        return { valid: false, error: 'Email must have exactly one @' };
      }
      break;

    case 'domain':
      // Domain format check
      if (normalized.includes('@')) {
        return { valid: false, error: 'Domain should not contain @' };
      }
      if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/.test(normalized)) {
        return { valid: false, error: 'Invalid domain format' };
      }
      break;

    case 'pattern':
      // Pattern can be more flexible but needs minimum length
      if (normalized.length < 2) {
        return { valid: false, error: 'Pattern must be at least 2 characters' };
      }
      // Check for invalid pattern (only wildcards)
      if (/^[*?]+$/.test(normalized)) {
        return { valid: false, error: 'Pattern cannot be only wildcards' };
      }
      break;
  }

  return { valid: true };
}

/**
 * Parse patterns from text (one per line)
 *
 * @param text - Text containing patterns (one per line)
 * @returns Array of patterns
 */
export function parsePatterns(text: string): string[] {
  return text
    .split(/[\n,;]/)
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}
