/**
 * Cache warming utilities.
 * Pre-populates caches with common domains for better performance.
 */

import { validateMx } from './validators/mx';
import { validateDomain } from './validators/domain';
import { COMMON_DOMAINS } from './constants';

/**
 * Cache warming status.
 */
export interface CacheWarmingStatus {
  isWarming: boolean;
  lastWarmedAt: string | null;
  domainsWarmed: number;
  errors: number;
}

let warmingStatus: CacheWarmingStatus = {
  isWarming: false,
  lastWarmedAt: null,
  domainsWarmed: 0,
  errors: 0,
};

/**
 * Get the current cache warming status.
 */
export function getCacheWarmingStatus(): CacheWarmingStatus {
  return { ...warmingStatus };
}

/**
 * Warm the cache with common domains.
 * This pre-fetches MX and domain information for frequently used domains.
 *
 * @param domains - Optional custom list of domains to warm (defaults to COMMON_DOMAINS)
 * @returns Promise that resolves when warming is complete
 */
export async function warmCache(domains: string[] = COMMON_DOMAINS): Promise<CacheWarmingStatus> {
  if (warmingStatus.isWarming) {
    return warmingStatus;
  }

  warmingStatus = {
    isWarming: true,
    lastWarmedAt: null,
    domainsWarmed: 0,
    errors: 0,
  };

  const results = await Promise.allSettled(
    domains.map(async (domain) => {
      await Promise.all([
        validateMx(domain),
        validateDomain(domain),
      ]);
      return domain;
    })
  );

  let warmed = 0;
  let errors = 0;

  for (const result of results) {
    if (result.status === 'fulfilled') {
      warmed++;
    } else {
      errors++;
    }
  }

  warmingStatus = {
    isWarming: false,
    lastWarmedAt: new Date().toISOString(),
    domainsWarmed: warmed,
    errors,
  };

  return warmingStatus;
}

/**
 * Warm cache in the background without blocking.
 * Useful for warming on server startup.
 */
export function warmCacheAsync(domains: string[] = COMMON_DOMAINS): void {
  // Don't block - warm in background
  warmCache(domains).catch((error) => {
    console.error('[Cache Warmer] Error warming cache:', error);
  });
}
