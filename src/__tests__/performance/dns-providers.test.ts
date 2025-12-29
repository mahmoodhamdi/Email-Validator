/**
 * @jest-environment node
 */
import {
  queryDns,
  getProviderStats,
  getDnsCacheStats,
  resetProviderState,
  clearDnsCaches,
  DNS_PROVIDERS,
} from '@/lib/dns';

// Mock fetch for DNS queries
const originalFetch = global.fetch;

beforeAll(() => {
  // Mock successful DNS responses
  global.fetch = jest.fn().mockImplementation((url: string) => {
    // Extract domain from URL
    const urlObj = new URL(url);
    const domain = urlObj.searchParams.get('name');
    const type = urlObj.searchParams.get('type');

    // Simulate successful MX response for gmail.com
    if (domain === 'gmail.com' && type === 'MX') {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            Status: 0,
            Answer: [
              { type: 15, data: '5 gmail-smtp-in.l.google.com.', TTL: 300, name: 'gmail.com' },
              { type: 15, data: '10 alt1.gmail-smtp-in.l.google.com.', TTL: 300, name: 'gmail.com' },
            ],
          }),
      });
    }

    // Simulate successful A record response
    if (type === 'A') {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            Status: 0,
            Answer: [
              { type: 1, data: '142.250.80.5', TTL: 300, name: domain },
            ],
          }),
      });
    }

    // Simulate no records for unknown domain
    if (domain === 'nonexistent-domain-12345.com') {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            Status: 3, // NXDOMAIN
            Answer: null,
          }),
      });
    }

    // Default: successful MX response
    return Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          Status: 0,
          Answer: [
            { type: 15, data: '10 mx.example.com.', TTL: 300, name: domain },
          ],
        }),
    });
  });
});

afterAll(() => {
  global.fetch = originalFetch;
});

beforeEach(() => {
  resetProviderState();
  jest.clearAllMocks();
});

describe('DNS Providers', () => {
  describe('DNS_PROVIDERS configuration', () => {
    it('should have multiple DNS providers configured', () => {
      expect(DNS_PROVIDERS.length).toBeGreaterThan(1);
    });

    it('should have Google DNS as the first provider', () => {
      expect(DNS_PROVIDERS[0].name).toBe('Google');
    });

    it('should have Cloudflare DNS as a fallback', () => {
      const cloudflare = DNS_PROVIDERS.find((p) => p.name === 'Cloudflare');
      expect(cloudflare).toBeDefined();
    });

    it('should have Quad9 DNS as a fallback', () => {
      const quad9 = DNS_PROVIDERS.find((p) => p.name === 'Quad9');
      expect(quad9).toBeDefined();
    });
  });

  describe('queryDns', () => {
    it('should return successful result for valid domain', async () => {
      const result = await queryDns('gmail.com', 'MX');

      expect(result.success).toBe(true);
      expect(result.records.length).toBeGreaterThan(0);
      expect(result.provider).toBeDefined();
    });

    it('should cache successful results', async () => {
      // First query
      const result1 = await queryDns('example.com', 'MX');
      expect(result1.cached).toBeFalsy();

      // Second query should hit cache
      const result2 = await queryDns('example.com', 'MX');
      expect(result2.cached).toBe(true);
      expect(result2.records).toEqual(result1.records);
    });

    it('should cache negative results separately', async () => {
      // Query for non-existent domain
      const result1 = await queryDns('nonexistent-domain-12345.com', 'MX');
      expect(result1.success).toBe(false);
      expect(result1.cached).toBeFalsy();

      // Second query should hit negative cache
      const result2 = await queryDns('nonexistent-domain-12345.com', 'MX');
      expect(result2.success).toBe(false);
      expect(result2.cached).toBe(true);
    });

    it('should differentiate cache by record type', async () => {
      // Query MX
      const mxResult = await queryDns('test.com', 'MX');
      expect(mxResult.cached).toBeFalsy();

      // Query A record for same domain
      const aResult = await queryDns('test.com', 'A');
      expect(aResult.cached).toBeFalsy();

      // Re-query MX should hit cache
      const mxResult2 = await queryDns('test.com', 'MX');
      expect(mxResult2.cached).toBe(true);
    });

    it('should handle case-insensitive domain names', async () => {
      // Query with different cases
      await queryDns('Example.COM', 'MX');
      const result = await queryDns('example.com', 'MX');

      // Should hit cache from the first query
      expect(result.cached).toBe(true);
    });
  });

  describe('Provider fallback', () => {
    it('should fallback to next provider on failure', async () => {
      // Make first provider fail
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation((_url: string) => {
        callCount++;
        if (callCount <= 1) {
          // First call fails
          return Promise.reject(new Error('Network error'));
        }
        // Subsequent calls succeed
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              Status: 0,
              Answer: [
                { type: 15, data: '10 mx.fallback.com.', TTL: 300, name: 'fallback.com' },
              ],
            }),
        });
      });

      const result = await queryDns('fallback.com', 'MX');

      expect(result.success).toBe(true);
      expect(callCount).toBeGreaterThan(1);
    });

    it('should track provider failures', async () => {
      // Make provider fail
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      try {
        await queryDns('failing-domain.com', 'MX');
      } catch {
        // Expected to throw
      }

      const stats = getProviderStats();
      const hasFailures = Object.values(stats).some((s) => s.failures > 0);
      expect(hasFailures).toBe(true);
    });
  });

  describe('getProviderStats', () => {
    it('should return stats for all providers', () => {
      const stats = getProviderStats();

      expect(Object.keys(stats).length).toBe(DNS_PROVIDERS.length);
      for (const provider of DNS_PROVIDERS) {
        expect(stats[provider.name]).toBeDefined();
        expect(stats[provider.name].failures).toBeGreaterThanOrEqual(0);
        expect(typeof stats[provider.name].isCurrent).toBe('boolean');
      }
    });

    it('should indicate current provider', () => {
      const stats = getProviderStats();

      const currentProviders = Object.values(stats).filter((s) => s.isCurrent);
      expect(currentProviders.length).toBe(1);
    });
  });

  describe('getDnsCacheStats', () => {
    it('should return stats for positive and negative caches', () => {
      const stats = getDnsCacheStats();

      expect(stats.positive).toBeDefined();
      expect(stats.negative).toBeDefined();
      expect(typeof stats.positive.size).toBe('number');
      expect(typeof stats.negative.size).toBe('number');
    });

    it('should track cache hits and misses', async () => {
      // Reset all state including caches
      resetProviderState();

      // Restore the mock for successful queries
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            Status: 0,
            Answer: [
              { type: 15, data: '10 mx.test.com.', TTL: 300, name: 'cache-test.com' },
            ],
          }),
      });

      // First query (miss)
      await queryDns('cache-test.com', 'MX');

      // Second query (hit)
      await queryDns('cache-test.com', 'MX');

      const stats = getDnsCacheStats();
      expect(stats.positive.hits).toBeGreaterThan(0);
    });
  });

  describe('resetProviderState', () => {
    it('should reset provider index', async () => {
      // Make all providers fail once to trigger rotation
      let calls = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        calls++;
        if (calls <= DNS_PROVIDERS.length) {
          return Promise.reject(new Error('Fail'));
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ Status: 0, Answer: [{ type: 15, data: '10 mx.test.com.', TTL: 300 }] }),
        });
      });

      try {
        await queryDns('reset-test.com', 'MX');
      } catch {
        // Expected - all providers fail
      }

      // After failures, current provider should have rotated
      // Reset state should restore to Google
      resetProviderState();

      const stats = getProviderStats();
      expect(stats['Google'].isCurrent).toBe(true);
      expect(stats['Google'].failures).toBe(0);
    });

    it('should clear DNS caches on reset', async () => {
      // Add something to cache
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ Status: 0, Answer: [{ type: 15, data: '10 mx.test.com.', TTL: 300 }] }),
      });

      await queryDns('cached-reset.com', 'MX');

      // Verify it's cached
      let stats = getDnsCacheStats();
      expect(stats.positive.size).toBeGreaterThan(0);

      // Reset
      resetProviderState();

      // Verify caches are cleared
      stats = getDnsCacheStats();
      expect(stats.positive.size).toBe(0);
      expect(stats.negative.size).toBe(0);
    });
  });

  describe('clearDnsCaches', () => {
    it('should clear both positive and negative caches', async () => {
      // Add to positive cache
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ Status: 0, Answer: [{ type: 15, data: '10 mx.test.com.', TTL: 300 }] }),
      });

      await queryDns('clear-test.com', 'MX');

      // Verify cached
      let stats = getDnsCacheStats();
      expect(stats.positive.size).toBeGreaterThan(0);

      // Clear caches
      clearDnsCaches();

      // Verify cleared
      stats = getDnsCacheStats();
      expect(stats.positive.size).toBe(0);
      expect(stats.negative.size).toBe(0);
    });
  });
});

describe('DNS Query Deduplication', () => {
  it('should cache results for subsequent queries to same domain', async () => {
    // Reset for clean test
    resetProviderState();

    // Track domains queried
    const queriedDomains: string[] = [];

    global.fetch = jest.fn().mockImplementation((url: string) => {
      const urlObj = new URL(url);
      const domain = urlObj.searchParams.get('name');
      queriedDomains.push(domain || '');

      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            Status: 0,
            Answer: [
              { type: 15, data: '10 mx.test.com.', TTL: 300, name: domain },
            ],
          }),
      });
    });

    // Query same domain sequentially (simulating cached bulk validation)
    await queryDns('dedup-test.com', 'MX');
    await queryDns('dedup-test.com', 'MX');
    await queryDns('dedup-test.com', 'MX');

    // First query should hit DNS, subsequent should hit cache
    // Only 1 actual DNS query should be made
    const dedupQueries = queriedDomains.filter((d) => d === 'dedup-test.com');
    expect(dedupQueries.length).toBe(1);
  });

  it('should make only one DNS call per unique domain', async () => {
    // Reset for clean test
    resetProviderState();

    // Track domains queried
    const queriedDomains: string[] = [];

    global.fetch = jest.fn().mockImplementation((url: string) => {
      const urlObj = new URL(url);
      const domain = urlObj.searchParams.get('name');
      queriedDomains.push(domain || '');

      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            Status: 0,
            Answer: [
              { type: 15, data: '10 mx.test.com.', TTL: 300, name: domain },
            ],
          }),
      });
    });

    // Query different domains
    await queryDns('domain1.com', 'MX');
    await queryDns('domain2.com', 'MX');
    await queryDns('domain1.com', 'MX'); // Should hit cache
    await queryDns('domain3.com', 'MX');
    await queryDns('domain2.com', 'MX'); // Should hit cache

    // Should have 3 unique DNS queries
    expect(queriedDomains.length).toBe(3);
    expect(queriedDomains).toContain('domain1.com');
    expect(queriedDomains).toContain('domain2.com');
    expect(queriedDomains).toContain('domain3.com');
  });
});
