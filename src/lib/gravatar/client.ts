/**
 * Gravatar Client
 *
 * Checks if an email has an associated Gravatar profile
 * and generates Gravatar URLs.
 */

import type { GravatarCheckResult } from './types';
import { md5Hash } from './hash';
import { LRUCache } from '../cache';

const GRAVATAR_BASE_URL = 'https://www.gravatar.com';

/**
 * Cache for Gravatar results
 * TTL: 1 hour (Gravatar profiles don't change frequently)
 */
const gravatarCache = new LRUCache<GravatarCheckResult>(500, 60 * 60 * 1000);

/**
 * Check if an email has a Gravatar profile
 *
 * @param email - Email address to check
 * @returns Gravatar check result
 */
export async function checkGravatar(email: string): Promise<GravatarCheckResult> {
  const normalizedEmail = email.trim().toLowerCase();

  // Check cache first
  const cached = gravatarCache.get(normalizedEmail);
  if (cached) {
    return cached;
  }

  try {
    const hash = md5Hash(normalizedEmail);

    // Check if Gravatar exists using d=404 parameter
    // This returns 404 if no Gravatar exists for the hash
    const checkUrl = `${GRAVATAR_BASE_URL}/avatar/${hash}?d=404&s=1`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(checkUrl, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      // Gravatar exists
      const result: GravatarCheckResult = {
        checked: true,
        gravatar: {
          exists: true,
          hash,
          url: `${GRAVATAR_BASE_URL}/avatar/${hash}?s=200`,
          thumbnailUrl: `${GRAVATAR_BASE_URL}/avatar/${hash}?s=80`,
          profileUrl: `${GRAVATAR_BASE_URL}/${hash}`,
        },
        message: 'Gravatar profile found',
      };

      gravatarCache.set(normalizedEmail, result);
      return result;
    }

    // Gravatar doesn't exist (404 response)
    const result: GravatarCheckResult = {
      checked: true,
      gravatar: {
        exists: false,
        hash,
        url: `${GRAVATAR_BASE_URL}/avatar/${hash}?d=mp`, // Default mystery person
        thumbnailUrl: `${GRAVATAR_BASE_URL}/avatar/${hash}?d=mp&s=80`,
      },
      message: 'No Gravatar profile',
    };

    gravatarCache.set(normalizedEmail, result);
    return result;
  } catch (error) {
    return {
      checked: false,
      message: error instanceof Error ? error.message : 'Failed to check Gravatar',
    };
  }
}

/**
 * Get Gravatar URL for an email (without checking if it exists)
 *
 * @param email - Email address
 * @param options - URL options
 * @returns Gravatar URL
 */
export function getGravatarUrl(
  email: string,
  options: {
    size?: number;
    default?: 'mp' | 'identicon' | 'monsterid' | 'wavatar' | 'retro' | 'robohash' | 'blank';
  } = {}
): string {
  const { size = 80, default: defaultImage = 'mp' } = options;
  const normalizedEmail = email.trim().toLowerCase();
  const hash = md5Hash(normalizedEmail);

  return `${GRAVATAR_BASE_URL}/avatar/${hash}?s=${size}&d=${defaultImage}`;
}

/**
 * Get Gravatar cache statistics
 */
export function getGravatarCacheStats() {
  return gravatarCache.getStats();
}

/**
 * Clear Gravatar cache
 */
export function clearGravatarCache(): void {
  gravatarCache.clear();
}
