/**
 * Email Authentication Module
 *
 * Provides SPF, DMARC, and DKIM checking for email domains.
 * Results are cached to improve performance.
 */

import { checkSPF } from './spf';
import { checkDMARC } from './dmarc';
import { checkDKIM } from './dkim';
import { LRUCache } from '../cache';
import type {
  AuthenticationResult,
  SPFCheckResult,
  DMARCCheckResult,
  DKIMCheckResult,
} from './types';

/**
 * Cache for authentication results
 * TTL: 10 minutes (DNS records don't change frequently)
 */
const authCache = new LRUCache<AuthenticationResult>(500, 10 * 60 * 1000);

/**
 * Check all email authentication records for a domain.
 * Runs SPF, DMARC, and DKIM checks in parallel.
 *
 * @param domain - Domain to check
 * @returns Complete authentication result with score
 */
export async function checkEmailAuthentication(
  domain: string
): Promise<AuthenticationResult> {
  const normalizedDomain = domain.toLowerCase().trim();

  // Check cache first
  const cached = authCache.get(normalizedDomain);
  if (cached) {
    return cached;
  }

  // Run all checks in parallel
  const [spf, dmarc, dkim] = await Promise.all([
    checkSPF(normalizedDomain),
    checkDMARC(normalizedDomain),
    checkDKIM(normalizedDomain),
  ]);

  // Calculate overall score
  const score = calculateAuthScore(spf, dmarc, dkim);
  const summary = generateSummary(spf, dmarc, dkim, score);

  const result: AuthenticationResult = {
    spf,
    dmarc,
    dkim,
    score,
    summary,
  };

  // Cache the result
  authCache.set(normalizedDomain, result);

  return result;
}

/**
 * Calculate authentication score (0-100)
 *
 * Scoring breakdown:
 * - SPF: max 35 points
 * - DMARC: max 35 points
 * - DKIM: max 30 points
 */
function calculateAuthScore(
  spf: SPFCheckResult,
  dmarc: DMARCCheckResult,
  dkim: DKIMCheckResult
): number {
  let score = 0;

  // SPF scoring (max 35 points)
  switch (spf.strength) {
    case 'strong':
      score += 35;
      break;
    case 'moderate':
      score += 25;
      break;
    case 'weak':
      score += 10;
      break;
    case 'none':
      score += 0;
      break;
  }

  // DMARC scoring (max 35 points)
  switch (dmarc.strength) {
    case 'strong':
      score += 35;
      break;
    case 'moderate':
      score += 25;
      break;
    case 'weak':
      score += 10;
      break;
    case 'none':
      score += 0;
      break;
  }

  // DKIM scoring (max 30 points)
  if (dkim.found) {
    const validRecords = dkim.records.filter((r) => r.valid).length;
    if (validRecords > 0) {
      // 15 points per valid record, max 30
      score += Math.min(30, validRecords * 15);
    }
  }

  return Math.min(100, score);
}

/**
 * Generate human-readable summary based on authentication status
 */
function generateSummary(
  spf: SPFCheckResult,
  dmarc: DMARCCheckResult,
  dkim: DKIMCheckResult,
  score: number
): string {
  if (score >= 80) {
    return 'Excellent email authentication configuration';
  } else if (score >= 60) {
    return 'Good email authentication with room for improvement';
  } else if (score >= 40) {
    return 'Basic email authentication configured';
  } else if (score > 0) {
    return 'Weak email authentication setup';
  } else {
    return 'No email authentication configured';
  }
}

/**
 * Get authentication cache statistics
 */
export function getAuthCacheStats() {
  return authCache.getStats();
}

/**
 * Clear authentication cache
 */
export function clearAuthCache() {
  authCache.clear();
}

// Re-export individual checkers and types
export { checkSPF, parseSPF } from './spf';
export { checkDMARC, parseDMARC } from './dmarc';
export { checkDKIM, parseDKIM } from './dkim';
export * from './types';
