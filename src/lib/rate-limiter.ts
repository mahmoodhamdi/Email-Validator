/**
 * Enhanced Rate Limiter for API endpoints.
 * Features:
 * - Sliding window algorithm for accurate rate limiting
 * - Client fingerprinting using IP + User-Agent hash
 * - Trusted IP bypass
 * - Per-key rate limits (integrated with API key tiers)
 */

import { RATE_LIMITS } from './constants';

/**
 * Sliding window entry - tracks request timestamps for accurate limiting.
 */
interface SlidingWindowEntry {
  timestamps: number[];
  windowStart: number;
}

/**
 * Rate limit result returned by check functions.
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetTime: number;
  retryAfter?: number;
}

/**
 * Rate limit configuration.
 */
export interface RateLimitConfig {
  requests: number;
  windowMs: number;
}

// In-memory store for sliding window rate limiting
const slidingWindowStore = new Map<string, SlidingWindowEntry>();

// Trusted IPs that bypass rate limiting
const trustedIPs = new Set<string>(
  (process.env.TRUSTED_IPS || '').split(',').map(ip => ip.trim()).filter(Boolean)
);

// Clean up expired entries periodically
const CLEANUP_INTERVAL = 60000; // 1 minute
let cleanupTimer: NodeJS.Timeout | null = null;

/**
 * Start the cleanup timer if not already running.
 */
function startCleanup(): void {
  if (cleanupTimer) {
    return;
  }

  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of slidingWindowStore.entries()) {
      // Remove entries with no recent activity
      if (entry.timestamps.length === 0 ||
          now - entry.windowStart > RATE_LIMITS.singleValidation.window * 2) {
        slidingWindowStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);

  // Don't prevent Node from exiting
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

/**
 * Simple hash function for client fingerprinting.
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Check if an IP is trusted and should bypass rate limiting.
 */
export function isTrustedIP(ip: string): boolean {
  if (trustedIPs.has(ip)) {
    return true;
  }

  // Check for localhost/loopback in development
  if (process.env.NODE_ENV === 'development') {
    const localhostIPs = ['127.0.0.1', '::1', 'localhost'];
    if (localhostIPs.includes(ip)) {
      return false; // Don't bypass in dev, to test rate limiting
    }
  }

  // Check for CIDR ranges (basic implementation)
  for (const trustedIP of trustedIPs) {
    if (trustedIP.includes('/')) {
      // Basic CIDR check for /24 networks
      const [network] = trustedIP.split('/');
      const networkParts = network.split('.');
      const ipParts = ip.split('.');
      if (networkParts.slice(0, 3).join('.') === ipParts.slice(0, 3).join('.')) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Get client IP from request, with validation.
 */
export function getClientIP(request: Request): string {
  // Check for Cloudflare's real IP header first (most reliable)
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP && isValidIP(cfConnectingIP)) {
    return cfConnectingIP;
  }

  // Check for X-Real-IP (common in nginx)
  const realIP = request.headers.get('x-real-ip');
  if (realIP && isValidIP(realIP)) {
    return realIP;
  }

  // Check X-Forwarded-For with validation
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    // Only trust the first IP if it looks valid
    const firstIP = forwarded.split(',')[0].trim();
    if (isValidIP(firstIP)) {
      return firstIP;
    }
  }

  // Fallback - generate a fingerprint based on available headers
  return 'unknown';
}

/**
 * Basic IP validation (IPv4 and IPv6).
 */
function isValidIP(ip: string): boolean {
  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Pattern.test(ip)) {
    const parts = ip.split('.').map(Number);
    return parts.every(part => part >= 0 && part <= 255);
  }

  // IPv6 pattern (simplified)
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  if (ipv6Pattern.test(ip)) {
    return true;
  }

  // Loopback
  if (ip === '::1' || ip === 'localhost') {
    return true;
  }

  return false;
}

/**
 * Get client identifier with fingerprinting.
 * Uses IP + User-Agent hash for better identification.
 */
export function getClientIdentifier(request: Request): string {
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || '';

  // If we have a real IP, use it with UA hash for fingerprinting
  if (ip !== 'unknown') {
    // Create a fingerprint from IP + first 100 chars of UA
    const uaFingerprint = simpleHash(userAgent.slice(0, 100));
    return `${ip}:${uaFingerprint}`;
  }

  // Fallback: Create a fingerprint from available headers
  const acceptLanguage = request.headers.get('accept-language') || '';
  const acceptEncoding = request.headers.get('accept-encoding') || '';

  const fingerprint = simpleHash(
    userAgent + acceptLanguage + acceptEncoding
  );

  return `fp:${fingerprint}`;
}

/**
 * Sliding window rate limit check.
 * More accurate than fixed window - prevents burst attacks at window boundaries.
 */
export function checkRateLimit(
  identifier: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  startCleanup();

  const now = Date.now();
  const windowStart = now - windowMs;

  // Get or create entry
  let entry = slidingWindowStore.get(identifier);

  if (!entry) {
    entry = {
      timestamps: [],
      windowStart: now,
    };
    slidingWindowStore.set(identifier, entry);
  }

  // Remove timestamps outside the sliding window
  entry.timestamps = entry.timestamps.filter(ts => ts > windowStart);

  // Count requests in the current window
  const requestCount = entry.timestamps.length;

  // Check if limit exceeded
  if (requestCount >= limit) {
    // Find when the oldest request will expire
    const oldestTimestamp = entry.timestamps[0] || now;
    const resetTime = oldestTimestamp + windowMs;
    const retryAfter = Math.ceil((resetTime - now) / 1000);

    return {
      allowed: false,
      remaining: 0,
      limit,
      resetTime,
      retryAfter: Math.max(1, retryAfter),
    };
  }

  // Add current request timestamp
  entry.timestamps.push(now);
  entry.windowStart = now;

  // Calculate reset time (when first request in window expires)
  const resetTime = entry.timestamps[0] + windowMs;

  return {
    allowed: true,
    remaining: limit - entry.timestamps.length,
    limit,
    resetTime,
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
 * Create rate limit headers for response.
 * Follows draft-ietf-httpapi-ratelimit-headers specification.
 */
export function createRateLimitHeaders(
  result: RateLimitResult,
  limit?: number
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-RateLimit-Limit': String(limit ?? result.limit),
    'X-RateLimit-Remaining': String(Math.max(0, result.remaining)),
    'X-RateLimit-Reset': String(Math.ceil(result.resetTime / 1000)),
  };

  if (result.retryAfter !== undefined) {
    headers['Retry-After'] = String(result.retryAfter);
  }

  return headers;
}

/**
 * Reset rate limit for a specific identifier (for testing).
 */
export function resetRateLimit(identifier: string): void {
  slidingWindowStore.delete(`single:${identifier}`);
  slidingWindowStore.delete(`bulk:${identifier}`);
}

/**
 * Clear all rate limits (for testing).
 */
export function clearAllRateLimits(): void {
  slidingWindowStore.clear();
}

/**
 * Get rate limit stats (for monitoring/debugging).
 */
export function getRateLimitStats(): {
  totalEntries: number;
  entries: Array<{ key: string; requestCount: number }>;
} {
  const entries: Array<{ key: string; requestCount: number }> = [];

  for (const [key, entry] of slidingWindowStore.entries()) {
    entries.push({
      key,
      requestCount: entry.timestamps.length,
    });
  }

  return {
    totalEntries: slidingWindowStore.size,
    entries,
  };
}

/**
 * Add an IP to the trusted list at runtime.
 */
export function addTrustedIP(ip: string): void {
  trustedIPs.add(ip);
}

/**
 * Remove an IP from the trusted list at runtime.
 */
export function removeTrustedIP(ip: string): void {
  trustedIPs.delete(ip);
}

/**
 * Check if rate limiting should be bypassed for this request.
 */
export function shouldBypassRateLimit(request: Request): boolean {
  const ip = getClientIP(request);
  return isTrustedIP(ip);
}
