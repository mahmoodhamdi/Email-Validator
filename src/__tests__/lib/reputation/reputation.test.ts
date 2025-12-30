/**
 * Domain Reputation Tests
 */

import { checkDomainAge } from '@/lib/reputation/age';
import { checkBlocklists } from '@/lib/reputation/blocklist';
import { checkDomainReputation } from '@/lib/reputation';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Domain Reputation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Domain Age Checker', () => {
    test('returns unknown age when RDAP fails with network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await checkDomainAge('example.com');

      expect(result.createdDate).toBeNull();
      expect(result.ageInDays).toBeNull();
      // Network errors are caught and return a generic message
      expect(result.message).toBe('Domain age could not be determined');
    });

    test('returns unknown age when RDAP returns non-OK response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
      });

      const result = await checkDomainAge('example.com');

      expect(result.createdDate).toBeNull();
      expect(result.ageInDays).toBeNull();
      expect(result.message).toBe('Domain age could not be determined');
    });

    test('calculates age correctly from RDAP response', async () => {
      const createdDate = new Date();
      createdDate.setDate(createdDate.getDate() - 100); // 100 days ago

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            events: [
              { eventAction: 'registration', eventDate: createdDate.toISOString() },
            ],
          }),
      });

      const result = await checkDomainAge('example.com');

      expect(result.ageInDays).toBeGreaterThanOrEqual(99);
      expect(result.ageInDays).toBeLessThanOrEqual(101);
      expect(result.isNew).toBe(false);
      expect(result.isYoung).toBe(true);
    });

    test('identifies new domain (less than 30 days)', async () => {
      const createdDate = new Date();
      createdDate.setDate(createdDate.getDate() - 15); // 15 days ago

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            events: [
              { eventAction: 'registration', eventDate: createdDate.toISOString() },
            ],
          }),
      });

      const result = await checkDomainAge('newdomain.com');

      expect(result.isNew).toBe(true);
      expect(result.isYoung).toBe(true);
      expect(result.message).toContain('days ago');
    });

    test('identifies very new domain (less than 7 days)', async () => {
      const createdDate = new Date();
      createdDate.setDate(createdDate.getDate() - 3); // 3 days ago

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            events: [
              { eventAction: 'registration', eventDate: createdDate.toISOString() },
            ],
          }),
      });

      const result = await checkDomainAge('verynew.com');

      expect(result.isNew).toBe(true);
      expect(result.message).toContain('very new');
    });

    test('identifies established domain (more than 1 year)', async () => {
      const createdDate = new Date();
      createdDate.setFullYear(createdDate.getFullYear() - 3); // 3 years ago

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            events: [
              { eventAction: 'registration', eventDate: createdDate.toISOString() },
            ],
          }),
      });

      const result = await checkDomainAge('established.com');

      expect(result.isNew).toBe(false);
      expect(result.isYoung).toBe(false);
      expect(result.message).toContain('year');
      expect(result.message).toContain('established');
    });

    test('returns unknown for unsupported TLD', async () => {
      // TLD not in RDAP_SERVERS will not call fetch
      const result = await checkDomainAge('example.xyz');

      expect(result.createdDate).toBeNull();
      expect(result.message).toBe('Domain age could not be determined');
    });
  });

  describe('Blocklist Checker', () => {
    test('detects suspicious TLD patterns', async () => {
      // Mock DNS over HTTPS responses
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ Answer: null }),
      });

      const result = await checkBlocklists('spammydomain.xyz');

      const patternCheck = result.lists.find(
        (l) => l.name === 'Suspicious Pattern Detection'
      );
      expect(patternCheck?.listed).toBe(true);
    });

    test('returns clean for normal domains', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ Answer: null }),
      });

      const result = await checkBlocklists('google.com');

      // Should not match suspicious patterns
      const patternCheck = result.lists.find(
        (l) => l.name === 'Suspicious Pattern Detection'
      );
      expect(patternCheck?.listed).toBe(false);
      expect(result.message).toBe('Not found on any blocklists');
    });

    test('detects domain on DNS blocklist', async () => {
      // First 3 calls for DNS blocklists, return listed for first one
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ Answer: [{ data: '127.0.0.2' }] }),
        })
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ Answer: null }),
        });

      const result = await checkBlocklists('spam.com');

      expect(result.listed).toBe(true);
      expect(result.message).toContain('blocklist');
    });

    test('handles network errors gracefully', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await checkBlocklists('example.com');

      // Should not crash, just assume not listed
      expect(result).toHaveProperty('listed');
      expect(result).toHaveProperty('lists');
    });

    test('detects suspicious long subdomain pattern', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ Answer: null }),
      });

      const result = await checkBlocklists('abcdefghijklmnopqrstuvwxyz.example.com');

      const patternCheck = result.lists.find(
        (l) => l.name === 'Suspicious Pattern Detection'
      );
      expect(patternCheck?.listed).toBe(true);
    });

    test('detects multiple consecutive separators', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ Answer: null }),
      });

      const result = await checkBlocklists('bad---domain.com');

      const patternCheck = result.lists.find(
        (l) => l.name === 'Suspicious Pattern Detection'
      );
      expect(patternCheck?.listed).toBe(true);
    });
  });

  describe('Reputation Calculator', () => {
    test('calculates good reputation for established domain', async () => {
      const createdDate = new Date();
      createdDate.setFullYear(createdDate.getFullYear() - 5); // 5 years ago

      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            events: [
              { eventAction: 'registration', eventDate: createdDate.toISOString() },
            ],
            Answer: null,
          }),
      });

      const result = await checkDomainReputation('google.com');

      expect(result.score).toBeGreaterThanOrEqual(70);
      expect(result.risk).toBe('low');
      expect(result.factors.some((f) => f.name === 'Premium TLD')).toBe(true);
    });

    test('calculates poor reputation for new high-risk TLD', async () => {
      // Mock RDAP failure (unsupported TLD)
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ Answer: null }),
      });

      const result = await checkDomainReputation('suspicious.xyz');

      // Should have high-risk TLD factor
      expect(result.factors.some((f) => f.name === 'High-Risk TLD')).toBe(true);
    });

    test('penalizes blocklisted domains', async () => {
      // First call is for RDAP (domain age), then blocklists
      // RDAP call returns not found, then first blocklist returns listed
      mockFetch
        .mockResolvedValueOnce({
          ok: false, // RDAP not found
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ Answer: [{ data: '127.0.0.2' }] }), // First blocklist - listed
        })
        .mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ Answer: null }), // Other blocklists - not listed
        });

      const result = await checkDomainReputation('spamsite.com');

      expect(result.blocklists.listed).toBe(true);
      expect(result.factors.some((f) => f.name === 'Blocklisted')).toBe(true);
    });

    test('rewards clean blocklist record', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ Answer: null }),
      });

      const result = await checkDomainReputation('cleansite.com');

      expect(result.blocklists.listed).toBe(false);
      expect(result.factors.some((f) => f.name === 'Clean Record')).toBe(true);
    });

    test('penalizes long domain names', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ Answer: null }),
      });

      const result = await checkDomainReputation(
        'averyveryverylongdomainname.com'
      );

      expect(result.factors.some((f) => f.name === 'Long Domain Name')).toBe(true);
    });

    test('penalizes domains with many hyphens', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ Answer: null }),
      });

      const result = await checkDomainReputation('my-test-domain-name.com');

      expect(result.factors.some((f) => f.name === 'Excessive Hyphens')).toBe(
        true
      );
    });

    test('penalizes domains with many numbers', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ Answer: null }),
      });

      const result = await checkDomainReputation('domain12345678.com');

      expect(result.factors.some((f) => f.name === 'Many Numbers')).toBe(true);
    });

    test('generates appropriate summary for different scores', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ Answer: null }),
      });

      const goodResult = await checkDomainReputation('example.com');
      expect(goodResult.summary).toBeTruthy();
      expect(typeof goodResult.summary).toBe('string');
    });

    test('determines correct risk levels', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ Answer: null }),
      });

      const result = await checkDomainReputation('example.com');

      // Risk should be one of the valid values
      expect(['low', 'medium', 'high', 'critical']).toContain(result.risk);
    });
  });
});
