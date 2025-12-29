/**
 * DNS provider configuration with fallback support.
 * Supports Google DNS, Cloudflare DNS, and Quad9.
 */

import { fetchWithTimeout } from '@/lib/utils/timeout';
import { VALIDATION_TIMEOUTS, CACHE_CONFIG } from '@/lib/constants';
import { LRUCache } from '@/lib/cache';

/**
 * DNS provider configuration.
 */
export interface DnsProvider {
  name: string;
  url: string;
  format: 'google' | 'doh';
}

/**
 * Available DNS-over-HTTPS providers.
 */
export const DNS_PROVIDERS: DnsProvider[] = [
  { name: 'Google', url: 'https://dns.google/resolve', format: 'google' },
  { name: 'Cloudflare', url: 'https://cloudflare-dns.com/dns-query', format: 'doh' },
  { name: 'Quad9', url: 'https://dns.quad9.net:5053/dns-query', format: 'doh' },
];

/**
 * DNS API response structure.
 */
export interface DnsApiResponse {
  Answer?: Array<{
    data: string;
    type: number;
    name: string;
    TTL: number;
  }>;
  Status: number;
  TC?: boolean;
  RD?: boolean;
  RA?: boolean;
  AD?: boolean;
  CD?: boolean;
}

/**
 * DNS query result.
 */
export interface DnsQueryResult {
  success: boolean;
  records: string[];
  ttl?: number;
  provider: string;
  cached?: boolean;
}

// Track provider state
let currentProviderIndex = 0;
const providerFailures: Record<string, number> = {};
const FAILURE_THRESHOLD = 3;
const FAILURE_RESET_MS = 60000; // Reset failure count after 1 minute
const lastFailureTime: Record<string, number> = {};

// Negative cache for failed DNS lookups (shorter TTL)
const negativeDnsCache = new LRUCache<DnsQueryResult>(
  CACHE_CONFIG.dnsNegative.maxSize,
  CACHE_CONFIG.dnsNegative.ttlMs
);

// Positive DNS cache (longer TTL)
const positiveDnsCache = new LRUCache<DnsQueryResult>(
  CACHE_CONFIG.mx.maxSize,
  CACHE_CONFIG.mx.ttlMs
);

/**
 * Reset failure count for a provider if enough time has passed.
 */
function resetFailureIfNeeded(providerName: string): void {
  const lastFailure = lastFailureTime[providerName];
  if (lastFailure && Date.now() - lastFailure > FAILURE_RESET_MS) {
    providerFailures[providerName] = 0;
  }
}

/**
 * Record a failure for a provider.
 */
function recordProviderFailure(providerName: string): void {
  providerFailures[providerName] = (providerFailures[providerName] || 0) + 1;
  lastFailureTime[providerName] = Date.now();

  // Rotate to next provider if failures exceed threshold
  if (providerFailures[providerName] >= FAILURE_THRESHOLD) {
    currentProviderIndex = (currentProviderIndex + 1) % DNS_PROVIDERS.length;
  }
}

/**
 * Record a success for a provider.
 */
function recordProviderSuccess(providerName: string): void {
  providerFailures[providerName] = 0;
}

/**
 * Build DNS query URL for a provider.
 */
function buildQueryUrl(provider: DnsProvider, domain: string, type: string): string {
  const encodedDomain = encodeURIComponent(domain);

  if (provider.format === 'google') {
    return `${provider.url}?name=${encodedDomain}&type=${type}`;
  }

  // DoH format (Cloudflare, Quad9)
  return `${provider.url}?name=${encodedDomain}&type=${type}`;
}

/**
 * Query DNS using a specific provider.
 */
async function queryProvider(
  provider: DnsProvider,
  domain: string,
  type: string,
  timeoutMs: number
): Promise<DnsApiResponse> {
  const url = buildQueryUrl(provider, domain, type);

  const response = await fetchWithTimeout(
    url,
    {
      method: 'GET',
      headers: {
        Accept: 'application/dns-json',
      },
    },
    timeoutMs
  );

  if (!response.ok) {
    throw new Error(`DNS query failed with status ${response.status}`);
  }

  return response.json();
}

/**
 * Query DNS records with automatic fallback to other providers.
 * Uses caching to reduce redundant lookups.
 *
 * @param domain - Domain to query
 * @param type - DNS record type (MX, A, etc.)
 * @returns DNS query result with provider info
 */
export async function queryDns(
  domain: string,
  type: string = 'MX'
): Promise<DnsQueryResult> {
  const cacheKey = `${domain.toLowerCase()}:${type.toUpperCase()}`;

  // Check positive cache first
  const positiveResult = positiveDnsCache.get(cacheKey);
  if (positiveResult) {
    return { ...positiveResult, cached: true };
  }

  // Check negative cache
  const negativeResult = negativeDnsCache.get(cacheKey);
  if (negativeResult) {
    return { ...negativeResult, cached: true };
  }

  // Perform DNS query
  const result = await performDnsQuery(domain, type);

  // Cache the result
  if (result.success) {
    positiveDnsCache.set(cacheKey, result);
  } else {
    negativeDnsCache.set(cacheKey, result);
  }

  return result;
}

/**
 * Perform the actual DNS query with provider fallback.
 */
async function performDnsQuery(
  domain: string,
  type: string
): Promise<DnsQueryResult> {
  const timeoutMs = VALIDATION_TIMEOUTS.dns;
  const errors: string[] = [];

  // Try each provider starting from the current one
  for (let i = 0; i < DNS_PROVIDERS.length; i++) {
    const providerIndex = (currentProviderIndex + i) % DNS_PROVIDERS.length;
    const provider = DNS_PROVIDERS[providerIndex];

    // Reset failure count if enough time has passed
    resetFailureIfNeeded(provider.name);

    // Skip providers with too many recent failures (unless it's the last option)
    if (
      providerFailures[provider.name] >= FAILURE_THRESHOLD &&
      i < DNS_PROVIDERS.length - 1
    ) {
      continue;
    }

    try {
      const data = await queryProvider(provider, domain, type, timeoutMs);

      // Record success
      recordProviderSuccess(provider.name);

      // Parse response
      if (data.Status !== 0) {
        return {
          success: false,
          records: [],
          provider: provider.name,
        };
      }

      // Extract records based on type
      const typeCode = getTypeCode(type);
      const records = data.Answer?.filter((r) => r.type === typeCode) || [];

      if (records.length === 0) {
        return {
          success: false,
          records: [],
          provider: provider.name,
        };
      }

      // Extract record data
      const recordData = records.map((r) => r.data);
      const minTtl = Math.min(...records.map((r) => r.TTL || 300));

      return {
        success: true,
        records: recordData,
        ttl: minTtl,
        provider: provider.name,
      };
    } catch (error) {
      // Record failure
      recordProviderFailure(provider.name);
      errors.push(`${provider.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);

      // Continue to next provider
      continue;
    }
  }

  // All providers failed
  throw new Error(`All DNS providers failed: ${errors.join('; ')}`);
}

/**
 * Get DNS record type code.
 */
function getTypeCode(type: string): number {
  const types: Record<string, number> = {
    A: 1,
    NS: 2,
    CNAME: 5,
    SOA: 6,
    MX: 15,
    TXT: 16,
    AAAA: 28,
  };
  return types[type.toUpperCase()] || 0;
}

/**
 * Get current provider statistics.
 */
export function getProviderStats(): Record<string, { failures: number; isCurrent: boolean }> {
  const stats: Record<string, { failures: number; isCurrent: boolean }> = {};

  DNS_PROVIDERS.forEach((provider, index) => {
    stats[provider.name] = {
      failures: providerFailures[provider.name] || 0,
      isCurrent: index === currentProviderIndex,
    };
  });

  return stats;
}

/**
 * Reset provider state (for testing).
 */
export function resetProviderState(): void {
  currentProviderIndex = 0;
  Object.keys(providerFailures).forEach((key) => {
    providerFailures[key] = 0;
  });
  Object.keys(lastFailureTime).forEach((key) => {
    delete lastFailureTime[key];
  });
  // Clear DNS caches
  positiveDnsCache.clear();
  negativeDnsCache.clear();
}

/**
 * Get DNS cache statistics.
 */
export function getDnsCacheStats(): {
  positive: ReturnType<LRUCache<DnsQueryResult>['getStats']>;
  negative: ReturnType<LRUCache<DnsQueryResult>['getStats']>;
} {
  return {
    positive: positiveDnsCache.getStats(),
    negative: negativeDnsCache.getStats(),
  };
}

/**
 * Clear DNS caches.
 */
export function clearDnsCaches(): void {
  positiveDnsCache.clear();
  negativeDnsCache.clear();
}
