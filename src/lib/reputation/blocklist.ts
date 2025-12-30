/**
 * Blocklist Checker
 *
 * Checks domains against DNS-based blocklists (DNSBL) and
 * detects suspicious domain patterns.
 */

import type { BlocklistResult, BlocklistEntry } from './types';

/**
 * DNS-based blocklists to check
 */
const DNS_BLOCKLISTS = [
  {
    name: 'Spamhaus DBL',
    zone: 'dbl.spamhaus.org',
    type: 'spam' as const,
    url: 'https://www.spamhaus.org/dbl/',
  },
  {
    name: 'SURBL',
    zone: 'multi.surbl.org',
    type: 'spam' as const,
    url: 'https://www.surbl.org/',
  },
  {
    name: 'URIBL',
    zone: 'multi.uribl.com',
    type: 'spam' as const,
    url: 'https://uribl.com/',
  },
];

/**
 * Suspicious domain patterns
 */
const SUSPICIOUS_PATTERNS = [
  /^[a-z]{20,}\./, // Very long random subdomain
  /^\d{5,}\./, // Many numbers at start
  /[.-]{3,}/, // Multiple consecutive separators
  /\.(xyz|top|work|click|link|gq|ml|cf|tk|ga)$/i, // High-risk TLDs
];

/**
 * Check domain against blocklists
 *
 * @param domain - Domain to check
 * @returns Blocklist check results
 */
export async function checkBlocklists(domain: string): Promise<BlocklistResult> {
  const results: BlocklistEntry[] = [];
  let listedCount = 0;

  // Check DNS-based blocklists in parallel
  const dnsblResults = await Promise.all(
    DNS_BLOCKLISTS.map((blocklist) => checkDNSBL(domain, blocklist))
  );

  for (const entry of dnsblResults) {
    results.push(entry);
    if (entry.listed) {
      listedCount++;
    }
  }

  // Check local patterns
  const patternCheck = checkSuspiciousPatterns(domain);
  results.push(patternCheck);
  if (patternCheck.listed) {
    listedCount++;
  }

  return {
    listed: listedCount > 0,
    lists: results,
    checkedCount: results.length,
    message:
      listedCount > 0
        ? `Listed on ${listedCount} blocklist(s)`
        : 'Not found on any blocklists',
  };
}

/**
 * Check domain against a DNS-based blocklist
 */
async function checkDNSBL(
  domain: string,
  blocklist: (typeof DNS_BLOCKLISTS)[0]
): Promise<BlocklistEntry> {
  try {
    // DNS-based blocklist lookup using DNS over HTTPS (for browser compatibility)
    const lookupDomain = `${domain}.${blocklist.zone}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(lookupDomain)}&type=A`,
      { signal: controller.signal }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        name: blocklist.name,
        listed: false,
        type: blocklist.type,
        url: blocklist.url,
      };
    }

    const data = await response.json();

    // If we get an answer, the domain is listed
    const listed = data.Answer && data.Answer.length > 0;

    return {
      name: blocklist.name,
      listed,
      type: blocklist.type,
      url: blocklist.url,
    };
  } catch {
    // Network error or timeout - assume not listed
    return {
      name: blocklist.name,
      listed: false,
      type: blocklist.type,
      url: blocklist.url,
    };
  }
}

/**
 * Check domain for suspicious patterns
 */
function checkSuspiciousPatterns(domain: string): BlocklistEntry {
  const isSuspicious = SUSPICIOUS_PATTERNS.some((pattern) =>
    pattern.test(domain)
  );

  return {
    name: 'Suspicious Pattern Detection',
    listed: isSuspicious,
    type: 'general',
  };
}
