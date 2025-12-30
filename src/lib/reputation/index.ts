/**
 * Domain Reputation Module
 *
 * Calculates domain reputation score based on:
 * - Domain age (newer = riskier)
 * - Blocklist presence
 * - TLD reputation
 * - Suspicious patterns
 */

import { checkDomainAge } from './age';
import { checkBlocklists } from './blocklist';
import { LRUCache } from '../cache';
import type {
  ReputationResult,
  ReputationFactor,
  DomainInfo,
  DomainAge,
  BlocklistResult,
} from './types';

/**
 * Cache for reputation results
 * TTL: 30 minutes (reputation doesn't change frequently)
 */
const reputationCache = new LRUCache<ReputationResult>(500, 30 * 60 * 1000);

/**
 * High-risk TLDs associated with spam/fraud
 */
const HIGH_RISK_TLDS = [
  'xyz',
  'top',
  'work',
  'click',
  'link',
  'gq',
  'ml',
  'cf',
  'tk',
  'ga',
  'buzz',
  'icu',
  'loan',
  'ooo',
];

/**
 * Premium/established TLDs
 */
const PREMIUM_TLDS = [
  'com',
  'net',
  'org',
  'edu',
  'gov',
  'io',
  'co',
  'dev',
  'app',
];

/**
 * Check domain reputation
 *
 * @param domain - Domain to check
 * @returns Reputation result with score and factors
 */
export async function checkDomainReputation(
  domain: string
): Promise<ReputationResult> {
  const normalizedDomain = domain.toLowerCase().trim();

  // Check cache first
  const cached = reputationCache.get(normalizedDomain);
  if (cached) {
    return cached;
  }

  // Run checks in parallel
  const [age, blocklists] = await Promise.all([
    checkDomainAge(normalizedDomain),
    checkBlocklists(normalizedDomain),
  ]);

  // Build domain info
  const domainInfo: DomainInfo = {
    domain: normalizedDomain,
    hasWhoisPrivacy: false, // Would need WHOIS lookup
  };

  // Calculate factors and score
  const factors = calculateFactors(age, blocklists, normalizedDomain);
  const score = calculateScore(factors);
  const risk = determineRisk(score);
  const summary = generateSummary(score, factors);

  const result: ReputationResult = {
    score,
    risk,
    age,
    blocklists,
    domainInfo,
    factors,
    summary,
  };

  // Cache result
  reputationCache.set(normalizedDomain, result);

  return result;
}

/**
 * Calculate reputation factors from checks
 */
function calculateFactors(
  age: DomainAge,
  blocklists: BlocklistResult,
  domain: string
): ReputationFactor[] {
  const factors: ReputationFactor[] = [];

  // Age factors
  if (age.ageInDays !== null) {
    if (age.ageInDays < 7) {
      factors.push({
        name: 'Very New Domain',
        impact: 'negative',
        score: -40,
        description: 'Domain registered less than a week ago',
      });
    } else if (age.isNew) {
      factors.push({
        name: 'New Domain',
        impact: 'negative',
        score: -25,
        description: 'Domain registered less than 30 days ago',
      });
    } else if (age.isYoung) {
      factors.push({
        name: 'Young Domain',
        impact: 'negative',
        score: -10,
        description: 'Domain registered less than 6 months ago',
      });
    } else if (age.ageInDays > 365 * 2) {
      factors.push({
        name: 'Established Domain',
        impact: 'positive',
        score: 20,
        description: 'Domain is more than 2 years old',
      });
    } else if (age.ageInDays > 365) {
      factors.push({
        name: 'Mature Domain',
        impact: 'positive',
        score: 10,
        description: 'Domain is more than 1 year old',
      });
    }
  }

  // Blocklist factors
  if (blocklists.listed) {
    const listedCount = blocklists.lists.filter((l) => l.listed).length;
    factors.push({
      name: 'Blocklisted',
      impact: 'negative',
      score: -30 * listedCount,
      description: `Found on ${listedCount} blocklist(s)`,
    });
  } else {
    factors.push({
      name: 'Clean Record',
      impact: 'positive',
      score: 15,
      description: 'Not found on any blocklists',
    });
  }

  // TLD factors
  const tld = domain.split('.').pop()?.toLowerCase();
  if (tld && HIGH_RISK_TLDS.includes(tld)) {
    factors.push({
      name: 'High-Risk TLD',
      impact: 'negative',
      score: -15,
      description: `The .${tld} TLD is associated with higher spam rates`,
    });
  } else if (tld && PREMIUM_TLDS.includes(tld)) {
    factors.push({
      name: 'Premium TLD',
      impact: 'positive',
      score: 10,
      description: `The .${tld} TLD is a well-established extension`,
    });
  }

  // Domain length factor
  const domainWithoutTLD = domain.split('.')[0];
  if (domainWithoutTLD && domainWithoutTLD.length > 25) {
    factors.push({
      name: 'Long Domain Name',
      impact: 'negative',
      score: -5,
      description: 'Unusually long domain name',
    });
  }

  // Check for excessive hyphens or numbers
  const mainPart = domain.split('.')[0] || '';
  const hyphenCount = (mainPart.match(/-/g) || []).length;
  const digitCount = (mainPart.match(/\d/g) || []).length;

  if (hyphenCount >= 3) {
    factors.push({
      name: 'Excessive Hyphens',
      impact: 'negative',
      score: -5,
      description: 'Domain contains many hyphens',
    });
  }

  if (digitCount >= 5) {
    factors.push({
      name: 'Many Numbers',
      impact: 'negative',
      score: -5,
      description: 'Domain contains many numbers',
    });
  }

  return factors;
}

/**
 * Calculate overall score from factors
 */
function calculateScore(factors: ReputationFactor[]): number {
  // Start with base score of 70
  let score = 70;

  for (const factor of factors) {
    score += factor.score;
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Determine risk level from score
 */
function determineRisk(score: number): ReputationResult['risk'] {
  if (score >= 80) {
    return 'low';
  }
  if (score >= 60) {
    return 'medium';
  }
  if (score >= 40) {
    return 'high';
  }
  return 'critical';
}

/**
 * Generate human-readable summary
 */
function generateSummary(score: number, factors: ReputationFactor[]): string {
  const negativeFactors = factors.filter((f) => f.impact === 'negative');

  if (score >= 80) {
    return 'Domain has good reputation with no significant risk factors';
  } else if (score >= 60) {
    return `Domain has moderate reputation. ${negativeFactors.length} risk factor(s) detected`;
  } else if (score >= 40) {
    return 'Domain has concerning reputation. Multiple risk factors detected';
  } else {
    return 'Domain has poor reputation and should be treated with caution';
  }
}

/**
 * Get reputation cache statistics
 */
export function getReputationCacheStats() {
  return reputationCache.getStats();
}

/**
 * Clear reputation cache
 */
export function clearReputationCache() {
  reputationCache.clear();
}

// Re-exports
export * from './types';
export { checkDomainAge } from './age';
export { checkBlocklists } from './blocklist';
