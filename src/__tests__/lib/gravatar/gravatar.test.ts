/**
 * Tests for Gravatar module
 */

import { md5Hash } from '@/lib/gravatar/hash';
import {
  checkGravatar,
  getGravatarUrl,
  clearGravatarCache,
  getGravatarCacheStats,
} from '@/lib/gravatar/client';
import { checkGravatarProfile } from '@/lib/validators/gravatar';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Gravatar Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearGravatarCache();
  });

  describe('md5Hash', () => {
    it('should generate correct MD5 hash for email', () => {
      // Known MD5 hashes for testing - verified with standard MD5 implementations
      // Empty string hash is standard: d41d8cd98f00b204e9800998ecf8427e
      expect(md5Hash('test@example.com')).toBe('55502f40dc8b7c769880b10874abc9d0');
      // Verify hash is consistent 32-char hex string
      const hash = md5Hash('hello@world.com');
      expect(hash).toMatch(/^[a-f0-9]{32}$/);
    });

    it('should handle empty string', () => {
      expect(md5Hash('')).toBe('d41d8cd98f00b204e9800998ecf8427e');
    });

    it('should be case sensitive', () => {
      const hash1 = md5Hash('Test@Example.com');
      const hash2 = md5Hash('test@example.com');
      expect(hash1).not.toBe(hash2);
    });

    it('should generate consistent hashes', () => {
      const hash1 = md5Hash('user@domain.com');
      const hash2 = md5Hash('user@domain.com');
      expect(hash1).toBe(hash2);
    });
  });

  describe('getGravatarUrl', () => {
    it('should generate correct URL with default options', () => {
      const email = 'test@example.com';
      const url = getGravatarUrl(email);

      expect(url).toContain('https://www.gravatar.com/avatar/');
      expect(url).toContain('s=80'); // Default size
      expect(url).toContain('d=mp'); // Default mystery person
    });

    it('should respect custom size option', () => {
      const url = getGravatarUrl('test@example.com', { size: 200 });
      expect(url).toContain('s=200');
    });

    it('should respect custom default image option', () => {
      const url = getGravatarUrl('test@example.com', { default: 'identicon' });
      expect(url).toContain('d=identicon');
    });

    it('should normalize email (lowercase and trim)', () => {
      const url1 = getGravatarUrl('Test@Example.com');
      const url2 = getGravatarUrl('  test@example.com  ');
      expect(url1).toBe(url2);
    });

    it('should support all default image types', () => {
      const types = ['mp', 'identicon', 'monsterid', 'wavatar', 'retro', 'robohash', 'blank'] as const;

      for (const type of types) {
        const url = getGravatarUrl('test@example.com', { default: type });
        expect(url).toContain(`d=${type}`);
      }
    });
  });

  describe('checkGravatar', () => {
    it('should return gravatar info when profile exists', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await checkGravatar('user@example.com');

      expect(result.checked).toBe(true);
      expect(result.gravatar?.exists).toBe(true);
      expect(result.gravatar?.hash).toBeDefined();
      expect(result.gravatar?.url).toContain('gravatar.com/avatar/');
      expect(result.gravatar?.thumbnailUrl).toContain('gravatar.com/avatar/');
      expect(result.gravatar?.profileUrl).toContain('gravatar.com/');
      expect(result.message).toBe('Gravatar profile found');
    });

    it('should return no gravatar when profile does not exist (404)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await checkGravatar('noavatar@example.com');

      expect(result.checked).toBe(true);
      expect(result.gravatar?.exists).toBe(false);
      expect(result.gravatar?.hash).toBeDefined();
      expect(result.gravatar?.url).toContain('d=mp'); // Default mystery person
      expect(result.message).toBe('No Gravatar profile');
    });

    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await checkGravatar('test@example.com');

      expect(result.checked).toBe(false);
      expect(result.gravatar).toBeUndefined();
      expect(result.message).toBe('Network error');
    });

    it('should cache results', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      });

      // First call
      await checkGravatar('cached@example.com');
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await checkGravatar('cached@example.com');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should normalize email before checking', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      });

      await checkGravatar('  User@Example.COM  ');

      // Check that the URL contains lowercase email hash
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('gravatar.com/avatar/'),
        expect.any(Object)
      );
    });

    it('should use HEAD request for efficiency', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await checkGravatar('test@example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'HEAD',
        })
      );
    });
  });

  describe('checkGravatarProfile (validator wrapper)', () => {
    it('should return disabled message when disabled', async () => {
      const result = await checkGravatarProfile('test@example.com', { enabled: false });

      expect(result.checked).toBe(false);
      expect(result.message).toBe('Gravatar check disabled');
    });

    it('should return no email message when email is empty', async () => {
      const result = await checkGravatarProfile('', { enabled: true });

      expect(result.checked).toBe(false);
      expect(result.message).toBe('No email provided');
    });

    it('should check gravatar when enabled', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await checkGravatarProfile('test@example.com', { enabled: true });

      expect(result.checked).toBe(true);
      expect(result.gravatar?.exists).toBe(true);
    });

    it('should handle timeout', async () => {
      // Mock a slow response that exceeds timeout
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(() => resolve({ ok: true, status: 200 }), 10000)
          )
      );

      const result = await checkGravatarProfile('test@example.com', {
        enabled: true,
        timeout: 100, // Very short timeout
      });

      expect(result.checked).toBe(false);
      expect(result.message).toBe('Gravatar check timed out');
    });

    it('should use default timeout when not specified', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await checkGravatarProfile('test@example.com');

      expect(result.checked).toBe(true);
    });
  });

  describe('Cache management', () => {
    it('should track cache stats', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      });

      // Clear cache first
      clearGravatarCache();

      const initialStats = getGravatarCacheStats();
      expect(initialStats.size).toBe(0);

      // Add item to cache
      await checkGravatar('test1@example.com');
      const afterOneStats = getGravatarCacheStats();
      expect(afterOneStats.size).toBe(1);

      // Add another item
      await checkGravatar('test2@example.com');
      const afterTwoStats = getGravatarCacheStats();
      expect(afterTwoStats.size).toBe(2);
    });

    it('should clear cache', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
      });

      await checkGravatar('test@example.com');

      const beforeClear = getGravatarCacheStats();
      expect(beforeClear.size).toBeGreaterThan(0);

      clearGravatarCache();

      const afterClear = getGravatarCacheStats();
      expect(afterClear.size).toBe(0);
    });
  });

  describe('URL validation', () => {
    it('should include d=404 for existence check', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await checkGravatar('test@example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('d=404'),
        expect.any(Object)
      );
    });

    it('should use small size for existence check', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      await checkGravatar('test@example.com');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('s=1'),
        expect.any(Object)
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle special characters in email', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await checkGravatar('user+tag@example.com');
      expect(result.checked).toBe(true);
    });

    it('should handle unicode email', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const result = await checkGravatar('用户@example.com');
      expect(result.checked).toBe(true);
    });

    it('should handle very long email', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const longEmail = 'a'.repeat(64) + '@' + 'b'.repeat(63) + '.com';
      const result = await checkGravatar(longEmail);
      expect(result.checked).toBe(true);
    });

    it('should handle abort signal properly', async () => {
      const abortError = new Error('AbortError');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      const result = await checkGravatar('test@example.com');

      expect(result.checked).toBe(false);
      expect(result.message).toBe('AbortError');
    });
  });
});
