/**
 * In-memory rate limiter for API endpoints.
 * For production, consider using Redis-based solution.
 */

import { RATE_LIMITS } from './constants';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

// In-memory store for rate limit tracking
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically
const CLEANUP_INTERVAL = 60000; // 1 minute

let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanup(): void {
  if (cleanupTimer) {
    return;
  }

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);

  // Don't prevent Node from exiting
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

/**
 * Check rate limit for a given identifier (usually IP address).
 *
 * @param identifier - Unique identifier for the client (IP, API key, etc.)
 * @param limit - Maximum number of requests allowed
 * @param windowMs - Time window in milliseconds
 * @returns Rate limit result with allowed status and metadata
 */
export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  startCleanup();

  const now = Date.now();
  const key = identifier;

  let entry = rateLimitStore.get(key);

  // If no entry or expired, create new one
  if (!entry || now > entry.resetTime) {
    entry = {
      count: 1,
      resetTime: now + windowMs,
    };
    rateLimitStore.set(key, entry);

    return {
      allowed: true,
      remaining: limit - 1,
      resetTime: entry.resetTime,
    };
  }

  // Increment count
  entry.count += 1;

  // Check if limit exceeded
  if (entry.count > limit) {
    const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      retryAfter,
    };
  }

  return {
    allowed: true,
    remaining: limit - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Check rate limit for single email validation endpoint.
 */
export function checkSingleValidationLimit(identifier: string): RateLimitResult {
  return checkRateLimit(
    `single:${identifier}`,
    RATE_LIMITS.singleValidation.max,
    RATE_LIMITS.singleValidation.window
  );
}

/**
 * Check rate limit for bulk email validation endpoint.
 */
export function checkBulkValidationLimit(identifier: string): RateLimitResult {
  return checkRateLimit(
    `bulk:${identifier}`,
    RATE_LIMITS.bulkValidation.max,
    RATE_LIMITS.bulkValidation.window
  );
}

/**
 * Get client identifier from request.
 * Uses X-Forwarded-For header for proxied requests, falls back to IP.
 */
export function getClientIdentifier(request: Request): string {
  // Check for forwarded IP (when behind proxy/load balancer)
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // Take the first IP in the chain (original client)
    return forwarded.split(',')[0].trim();
  }

  // Check for real IP header (Cloudflare, etc.)
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to a default identifier for local development
  return 'unknown';
}

/**
 * Create rate limit headers for response.
 */
export function createRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(RATE_LIMITS.singleValidation.max),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
  };

  if (result.retryAfter) {
    headers['Retry-After'] = String(result.retryAfter);
  }

  return headers;
}

/**
 * Reset rate limit for testing purposes.
 */
export function resetRateLimit(identifier: string): void {
  rateLimitStore.delete(`single:${identifier}`);
  rateLimitStore.delete(`bulk:${identifier}`);
}

/**
 * Clear all rate limits (for testing).
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}
