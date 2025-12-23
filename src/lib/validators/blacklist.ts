import type { BlacklistCheck } from '@/types/email';
import { getDnsBlacklists } from '@/lib/data/blacklists';
import { LRUCache } from '@/lib/cache';

interface DnsApiResponse {
  Answer?: Array<{
    data: string;
    type: number;
  }>;
  Status: number;
}

/**
 * Cache for blacklist check results.
 * TTL: 10 minutes (blacklist status doesn't change frequently)
 */
const blacklistCache = new LRUCache<BlacklistCheck>(500, 600000);

/**
 * Validate if a domain is listed on any DNS blacklists.
 * Uses Google's DNS-over-HTTPS API to check multiple blacklists in parallel.
 *
 * @param domain - The domain to check against blacklists
 * @returns BlacklistCheck result with status and matched lists
 */
export async function validateBlacklist(domain: string): Promise<BlacklistCheck> {
  const normalizedDomain = domain.toLowerCase();

  // Check cache first
  const cached = blacklistCache.get(normalizedDomain);
  if (cached) {
    return cached;
  }

  const result = await performBlacklistCheck(normalizedDomain);

  // Cache the result
  blacklistCache.set(normalizedDomain, result);

  return result;
}

/**
 * Perform the actual blacklist lookup.
 */
async function performBlacklistCheck(domain: string): Promise<BlacklistCheck> {
  try {
    const blacklists = getDnsBlacklists();
    const matchedLists: string[] = [];

    // Check a subset of blacklists to avoid too many requests
    // Use the first 5 most reliable ones for performance
    const listsToCheck = blacklists.slice(0, 5);

    // Perform checks in parallel with timeout
    const results = await Promise.allSettled(
      listsToCheck.map((bl) => checkSingleBlacklist(domain, bl))
    );

    // Collect results
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        matchedLists.push(listsToCheck[index]);
      }
    });

    return {
      isBlacklisted: matchedLists.length > 0,
      lists: matchedLists,
    };
  } catch {
    // On error, return not blacklisted (fail open for better UX)
    return {
      isBlacklisted: false,
      lists: [],
    };
  }
}

/**
 * Check if a domain is listed on a specific blacklist.
 * Uses DNS lookup format: <reversed-ip>.<blacklist-server>
 *
 * For domain blacklists, we just append the domain to the blacklist server.
 */
async function checkSingleBlacklist(domain: string, blacklist: string): Promise<boolean> {
  try {
    // For domain-based blacklists, query <domain>.<blacklist>
    const queryDomain = `${domain}.${blacklist}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

    const response = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(queryDomain)}&type=A`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/dns-json',
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      return false;
    }

    const data: DnsApiResponse = await response.json();

    // Status 0 (NOERROR) with an A record means the domain is listed
    // Most blacklists return 127.0.0.x when a domain is listed
    if (data.Status === 0 && data.Answer && data.Answer.length > 0) {
      // Check if any of the answers are in the 127.x.x.x range (blacklist hit)
      return data.Answer.some((answer) => {
        if (answer.type === 1) {
          // A record
          return answer.data.startsWith('127.');
        }
        return false;
      });
    }

    return false;
  } catch {
    // Timeout or network error - assume not blacklisted
    return false;
  }
}

/**
 * Clear the blacklist cache.
 * Useful for testing.
 */
export function clearBlacklistCache(): void {
  blacklistCache.clear();
}

/**
 * Get blacklist cache statistics.
 */
export function getBlacklistCacheStats() {
  return blacklistCache.getStats();
}
