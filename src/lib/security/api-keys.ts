/**
 * API Key Management System
 * Handles API key validation, permissions, and rate limit overrides.
 */

/**
 * Permission types for API keys.
 */
export type APIKeyPermission = 'validate' | 'bulk' | 'admin';

/**
 * Rate limit tier for API keys.
 */
export type RateLimitTier = 'free' | 'pro' | 'enterprise';

/**
 * API Key structure.
 */
export interface APIKey {
  key: string;
  name: string;
  permissions: APIKeyPermission[];
  tier: RateLimitTier;
  rateLimit?: number; // Override default rate limit (requests per minute)
  expiresAt?: Date;
  createdAt: Date;
}

/**
 * API Key validation result.
 */
export interface APIKeyValidationResult {
  valid: boolean;
  key?: APIKey;
  error?: string;
  errorCode?: APIKeyErrorCode;
}

/**
 * Error codes for API key validation.
 */
export type APIKeyErrorCode =
  | 'MISSING_KEY'
  | 'INVALID_KEY'
  | 'EXPIRED_KEY'
  | 'INSUFFICIENT_PERMISSIONS';

/**
 * Rate limits per tier (requests per minute).
 */
export const TIER_RATE_LIMITS: Record<RateLimitTier, number> = {
  free: 100,
  pro: 1000,
  enterprise: 10000,
};

/**
 * Parse API keys from environment variable.
 * Format: key:name:permissions:tier;key:name:permissions:tier
 * Example: abc123:MyApp:validate,bulk:pro;xyz789:TestApp:validate:free
 */
export function parseAPIKeysFromEnv(): Map<string, APIKey> {
  const apiKeysEnv = process.env.API_KEYS || '';
  const keys = new Map<string, APIKey>();

  if (!apiKeysEnv.trim()) {
    return keys;
  }

  const keyEntries = apiKeysEnv.split(';').filter(Boolean);

  for (const entry of keyEntries) {
    const parts = entry.split(':');

    if (parts.length < 3) {
      console.warn(`Invalid API key format: ${entry}`);
      continue;
    }

    const [key, name, permissionsStr, tierStr, expiresAtStr] = parts;

    // Parse permissions
    const permissions = permissionsStr
      .split(',')
      .map((p) => p.trim().toLowerCase())
      .filter((p): p is APIKeyPermission =>
        ['validate', 'bulk', 'admin'].includes(p)
      );

    // Parse tier (default to 'free')
    const tier: RateLimitTier =
      tierStr && ['free', 'pro', 'enterprise'].includes(tierStr.toLowerCase())
        ? (tierStr.toLowerCase() as RateLimitTier)
        : 'free';

    // Parse expiration date if provided
    let expiresAt: Date | undefined;
    if (expiresAtStr) {
      const expDate = new Date(expiresAtStr);
      if (!isNaN(expDate.getTime())) {
        expiresAt = expDate;
      }
    }

    keys.set(key, {
      key,
      name: name || 'Unnamed',
      permissions,
      tier,
      expiresAt,
      createdAt: new Date(),
    });
  }

  return keys;
}

// Cached API keys (lazy loaded)
let cachedAPIKeys: Map<string, APIKey> | null = null;
let cacheLoadTime: number = 0;
const CACHE_TTL = 60000; // Reload from env every 60 seconds

/**
 * Get API keys (with caching).
 */
export function getAPIKeys(): Map<string, APIKey> {
  const now = Date.now();

  if (!cachedAPIKeys || now - cacheLoadTime > CACHE_TTL) {
    cachedAPIKeys = parseAPIKeysFromEnv();
    cacheLoadTime = now;
  }

  return cachedAPIKeys;
}

/**
 * Clear the API keys cache (useful for testing).
 */
export function clearAPIKeysCache(): void {
  cachedAPIKeys = null;
  cacheLoadTime = 0;
}

/**
 * Validate an API key.
 */
export function validateAPIKey(
  key: string | null,
  requiredPermission?: APIKeyPermission
): APIKeyValidationResult {
  // Check if API key authentication is enabled
  const apiKeyRequired = process.env.API_KEY_REQUIRED === 'true';

  // If no key provided
  if (!key) {
    if (!apiKeyRequired) {
      // Authentication not required, allow through
      return { valid: true };
    }
    return {
      valid: false,
      error: 'API key is required',
      errorCode: 'MISSING_KEY',
    };
  }

  // Get stored API keys
  const apiKeys = getAPIKeys();
  const apiKey = apiKeys.get(key);

  // Check if key exists
  if (!apiKey) {
    return {
      valid: false,
      error: 'Invalid API key',
      errorCode: 'INVALID_KEY',
    };
  }

  // Check if key is expired
  if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
    return {
      valid: false,
      error: 'API key has expired',
      errorCode: 'EXPIRED_KEY',
    };
  }

  // Check permissions if required
  if (requiredPermission && !apiKey.permissions.includes(requiredPermission)) {
    // Admin permission overrides all
    if (!apiKey.permissions.includes('admin')) {
      return {
        valid: false,
        error: `API key does not have '${requiredPermission}' permission`,
        errorCode: 'INSUFFICIENT_PERMISSIONS',
      };
    }
  }

  return {
    valid: true,
    key: apiKey,
  };
}

/**
 * Get the rate limit for an API key.
 */
export function getAPIKeyRateLimit(apiKey: APIKey | undefined): number {
  if (!apiKey) {
    // Return anonymous rate limit
    return 20; // 20 requests per minute for anonymous
  }

  // Check for custom rate limit override
  if (apiKey.rateLimit) {
    return apiKey.rateLimit;
  }

  // Return tier-based rate limit
  return TIER_RATE_LIMITS[apiKey.tier];
}

/**
 * Check if a request is from the same origin (frontend).
 */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');

  // No origin header usually means same-origin request
  if (!origin && !referer) {
    return true;
  }

  // Check if origin matches host
  if (origin && host) {
    try {
      const originUrl = new URL(origin);
      // Compare hostnames (without port for flexibility)
      if (originUrl.hostname === host.split(':')[0]) {
        return true;
      }
      // Also check localhost variations
      const localhostVariants = ['localhost', '127.0.0.1', '::1'];
      if (
        localhostVariants.includes(originUrl.hostname) &&
        localhostVariants.some((v) => host.startsWith(v))
      ) {
        return true;
      }
    } catch {
      // Invalid URL, not same origin
    }
  }

  // Check referer as fallback
  if (referer && host) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.hostname === host.split(':')[0]) {
        return true;
      }
    } catch {
      // Invalid URL
    }
  }

  return false;
}

/**
 * Generate a random API key.
 */
export function generateAPIKey(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length];
  }

  return result;
}
