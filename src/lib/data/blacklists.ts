/**
 * DNS-based Blackhole Lists (DNSBLs) for email validation.
 * These are public DNS blacklists used to check if a domain is flagged for spam.
 */

/**
 * List of DNS blacklist servers.
 * These are queried using reverse DNS lookup format.
 */
export const dnsBlacklists = [
  'zen.spamhaus.org',
  'bl.spamcop.net',
  'b.barracudacentral.org',
  'dnsbl.sorbs.net',
  'spam.dnsbl.sorbs.net',
  'cbl.abuseat.org',
  'dnsbl-1.uceprotect.net',
  'psbl.surriel.com',
  'all.s5h.net',
  'rbl.interserver.net',
];

/**
 * Get the list of DNS blacklists.
 */
export function getDnsBlacklists(): readonly string[] {
  return dnsBlacklists;
}

/**
 * Number of blacklists available.
 */
export const BLACKLIST_COUNT = dnsBlacklists.length;
