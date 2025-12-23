/**
 * Tests for blacklist validation.
 */

import { validateBlacklist, clearBlacklistCache, getBlacklistCacheStats } from '@/lib/validators/blacklist';
import { getDnsBlacklists } from '@/lib/data/blacklists';

// Mock fetch for DNS lookups
const originalFetch = global.fetch;

beforeAll(() => {
  global.fetch = jest.fn();
});

afterAll(() => {
  global.fetch = originalFetch;
});

beforeEach(() => {
  clearBlacklistCache();
  jest.clearAllMocks();
});

describe('validateBlacklist', () => {
  describe('clean domains', () => {
    beforeEach(() => {
      // Mock DNS responses for clean domains (NXDOMAIN = no blacklist entry)
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          Status: 3, // NXDOMAIN - domain not found = not blacklisted
          Answer: null,
        }),
      });
    });

    it('should return not blacklisted for clean domain', async () => {
      const result = await validateBlacklist('gmail.com');

      expect(result.isBlacklisted).toBe(false);
      expect(result.lists).toEqual([]);
    });

    it('should cache results', async () => {
      await validateBlacklist('example.com');
      await validateBlacklist('example.com');

      // Should only make requests once (cached)
      const stats = getBlacklistCacheStats();
      expect(stats.hits).toBeGreaterThan(0);
    });

    it('should handle multiple clean domains', async () => {
      const domains = ['google.com', 'microsoft.com', 'apple.com'];

      for (const domain of domains) {
        const result = await validateBlacklist(domain);
        expect(result.isBlacklisted).toBe(false);
      }
    });
  });

  describe('blacklisted domains', () => {
    it('should detect blacklisted domain', async () => {
      // Mock DNS responses for blacklisted domain (returns 127.0.0.x)
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          Status: 0, // NOERROR - found entry
          Answer: [
            { type: 1, data: '127.0.0.2' }, // Typical blacklist response
          ],
        }),
      });

      const result = await validateBlacklist('spammer.example.com');

      expect(result.isBlacklisted).toBe(true);
      expect(result.lists.length).toBeGreaterThan(0);
    });

    it('should list which blacklists matched', async () => {
      // Mock first blacklist as matching, rest as not
      let callCount = 0;
      (global.fetch as jest.Mock).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              Status: 0,
              Answer: [{ type: 1, data: '127.0.0.2' }],
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({
            Status: 3,
            Answer: null,
          }),
        });
      });

      const result = await validateBlacklist('partial-blacklist.com');

      expect(result.isBlacklisted).toBe(true);
      expect(result.lists.length).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await validateBlacklist('error-domain.com');

      // Should fail open (not blacklisted on error)
      expect(result.isBlacklisted).toBe(false);
      expect(result.lists).toEqual([]);
    });

    it('should handle non-OK responses', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
      });

      const result = await validateBlacklist('server-error.com');

      expect(result.isBlacklisted).toBe(false);
    });

    it('should handle timeout', async () => {
      (global.fetch as jest.Mock).mockImplementation(() =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('AbortError')), 100);
        })
      );

      const result = await validateBlacklist('slow-domain.com');

      expect(result.isBlacklisted).toBe(false);
    });
  });

  describe('caching', () => {
    beforeEach(() => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ Status: 3, Answer: null }),
      });
    });

    it('should cache blacklist results', async () => {
      // First call
      const result1 = await validateBlacklist('cached-domain.com');

      // Clear mock call count
      (global.fetch as jest.Mock).mockClear();

      // Second call (should use cache)
      const result2 = await validateBlacklist('cached-domain.com');

      expect(result1).toEqual(result2);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should normalize domain for caching', async () => {
      await validateBlacklist('EXAMPLE.COM');

      (global.fetch as jest.Mock).mockClear();

      await validateBlacklist('example.com');

      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});

describe('getDnsBlacklists', () => {
  it('should return array of blacklist servers', () => {
    const blacklists = getDnsBlacklists();

    expect(Array.isArray(blacklists)).toBe(true);
    expect(blacklists.length).toBeGreaterThan(0);
  });

  it('should contain known blacklist servers', () => {
    const blacklists = getDnsBlacklists();

    expect(blacklists).toContain('zen.spamhaus.org');
    expect(blacklists).toContain('bl.spamcop.net');
  });
});
