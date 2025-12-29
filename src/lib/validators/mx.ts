import type { MxCheck } from '@/types/email';
import { mxCache } from '@/lib/cache';
import { isTimeoutError } from '@/lib/utils/timeout';
import { getCircuitBreaker, CircuitOpenError } from '@/lib/utils/circuit-breaker';
import { DNS_CIRCUIT_BREAKER } from '@/lib/constants';
import { queryDns } from '@/lib/dns';

// Circuit breaker for DNS service (covers all providers)
const dnsCircuitBreaker = getCircuitBreaker('dns-providers', DNS_CIRCUIT_BREAKER);

/**
 * Validate MX records for a domain.
 * Results are cached to reduce DNS lookups.
 *
 * @param domain - The domain to check MX records for
 * @returns MxCheck result with validity, records, and message
 */
export async function validateMx(domain: string): Promise<MxCheck> {
  const normalizedDomain = domain.toLowerCase();

  // Check cache first
  const cached = mxCache.get(normalizedDomain);
  if (cached) {
    return cached;
  }

  // Perform the actual validation
  const result = await performMxLookup(normalizedDomain);

  // Cache the result (both success and failure)
  mxCache.set(normalizedDomain, result);

  return result;
}

/**
 * Perform the actual MX record lookup via Google's DNS-over-HTTPS API.
 * Uses timeout and circuit breaker for resilience.
 */
async function performMxLookup(domain: string): Promise<MxCheck> {
  const normalizedDomain = domain.toLowerCase();

  // Check if circuit breaker is open - return cached or unknown status
  if (dnsCircuitBreaker.isOpen()) {
    const cached = mxCache.get(normalizedDomain);
    if (cached) {
      return { ...cached, message: `${cached.message} (cached - DNS unavailable)` };
    }
    return {
      valid: false,
      records: [],
      message: 'DNS service temporarily unavailable',
    };
  }

  try {
    // Use circuit breaker to execute the DNS lookup
    return await dnsCircuitBreaker.execute(async () => {
      return await performDnsLookup(domain);
    });
  } catch (error) {
    // Handle circuit breaker open error
    if (error instanceof CircuitOpenError) {
      const cached = mxCache.get(normalizedDomain);
      if (cached) {
        return { ...cached, message: `${cached.message} (cached - DNS unavailable)` };
      }
      return {
        valid: false,
        records: [],
        message: 'DNS service temporarily unavailable',
      };
    }

    // Handle timeout error
    if (isTimeoutError(error)) {
      const cached = mxCache.get(normalizedDomain);
      if (cached) {
        return { ...cached, message: `${cached.message} (cached - DNS timeout)` };
      }
      return {
        valid: false,
        records: [],
        message: 'DNS lookup timed out',
      };
    }

    return {
      valid: false,
      records: [],
      message: 'Error checking MX records',
    };
  }
}

/**
 * Perform DNS lookup with provider fallback.
 */
async function performDnsLookup(domain: string): Promise<MxCheck> {
  // Query MX records using DNS provider with fallback
  const mxResult = await queryDns(domain, 'MX');

  if (!mxResult.success || mxResult.records.length === 0) {
    // Try A record as fallback (some domains accept mail without MX)
    try {
      const aResult = await queryDns(domain, 'A');

      if (aResult.success && aResult.records.length > 0) {
        return {
          valid: true,
          records: ['[A record fallback]'],
          message: 'Domain has A record (MX fallback)',
        };
      }
    } catch {
      // Ignore A record lookup errors
    }

    return {
      valid: false,
      records: [],
      message: 'No MX records found for domain',
    };
  }

  // Extract MX hostnames
  const records = mxResult.records.map((record) => {
    // MX data format: "priority hostname."
    const parts = record.split(' ');
    return parts.length > 1 ? parts[1].replace(/\.$/, '') : record;
  });

  return {
    valid: true,
    records,
    message: `Found ${records.length} MX record(s)`,
  };
}
