import type { CatchAllCheck } from '@/types/email';
import { LRUCache } from '@/lib/cache';

/**
 * Known domains that are configured as catch-all.
 * These domains accept emails to any address.
 */
const knownCatchAllDomains = new Set([
  // Common catch-all configured domains
  'mailinator.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'guerrillamail.biz',
  'sharklasers.com',
  'grr.la',
  'guerrillamailblock.com',
  'pokemail.net',
  'spam4.me',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'cool.fr.nf',
  'jetable.fr.nf',
  'nospam.ze.tc',
  'nomail.xl.cx',
  'mega.zik.dj',
  'speed.1s.fr',
  'courriel.fr.nf',
  'moncourrier.fr.nf',
  'monemail.fr.nf',
  'monmail.fr.nf',
  'discard.email',
  'discardmail.com',
  'discardmail.de',
  'spambog.com',
  'spambog.de',
  'spambog.ru',
  'mailnesia.com',
  'mytrashmail.com',
  'mt2015.com',
  'thankyou2010.com',
  'trash2010.com',
  'trashmail.net',
  'trashmail.org',
  'trashmail.com',
  'trashmail.me',
  'fakeinbox.com',
  'tempinbox.com',
  'throwawaymail.com',
  'tempmailaddress.com',
  'tempmail.net',
  'temp-mail.org',
  'getnada.com',
  'mohmal.com',
  'emailondeck.com',
  'mintemail.com',
  'mailcatch.com',
]);

/**
 * Patterns that suggest a domain might be catch-all.
 */
const catchAllPatterns = [
  /^mailinator\./i,
  /^guerrilla/i,
  /tempmail/i,
  /throwaway/i,
  /fakeinbox/i,
  /trashmail/i,
  /^discard/i,
  /^temp-?mail/i,
  /^disposable/i,
];

/**
 * Cache for catch-all check results.
 * TTL: 30 minutes (catch-all status is generally stable)
 */
const catchAllCache = new LRUCache<CatchAllCheck>(500, 1800000);

/**
 * Check if a domain is likely configured as a catch-all.
 * Uses a heuristic approach based on known domains and patterns.
 *
 * Note: Accurate catch-all detection typically requires SMTP verification,
 * which is not possible in a browser environment. This uses a heuristic approach.
 *
 * @param domain - The domain to check
 * @returns CatchAllCheck result
 */
export function validateCatchAll(domain: string): CatchAllCheck {
  const normalizedDomain = domain.toLowerCase();

  // Check cache first
  const cached = catchAllCache.get(normalizedDomain);
  if (cached) {
    return cached;
  }

  const result = performCatchAllCheck(normalizedDomain);

  // Cache the result
  catchAllCache.set(normalizedDomain, result);

  return result;
}

/**
 * Perform the actual catch-all check.
 */
function performCatchAllCheck(domain: string): CatchAllCheck {
  // Check known catch-all domains
  if (knownCatchAllDomains.has(domain)) {
    return { isCatchAll: true };
  }

  // Check for subdomains of known catch-all domains
  const parts = domain.split('.');
  if (parts.length > 2) {
    const rootDomain = parts.slice(-2).join('.');
    if (knownCatchAllDomains.has(rootDomain)) {
      return { isCatchAll: true };
    }
  }

  // Check against patterns
  for (const pattern of catchAllPatterns) {
    if (pattern.test(domain)) {
      return { isCatchAll: true };
    }
  }

  // Default to not catch-all
  return { isCatchAll: false };
}

/**
 * Check if a domain is in the known catch-all list.
 *
 * @param domain - The domain to check
 * @returns true if the domain is known to be catch-all
 */
export function isKnownCatchAll(domain: string): boolean {
  return knownCatchAllDomains.has(domain.toLowerCase());
}

/**
 * Clear the catch-all cache.
 * Useful for testing.
 */
export function clearCatchAllCache(): void {
  catchAllCache.clear();
}

/**
 * Get catch-all cache statistics.
 */
export function getCatchAllCacheStats() {
  return catchAllCache.getStats();
}
