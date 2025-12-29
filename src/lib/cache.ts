/**
 * LRU (Least Recently Used) Cache with TTL support.
 * Used for caching DNS lookups, MX records, and validation results.
 */

interface CacheEntry<T> {
  value: T;
  expiry: number;
  lastAccessed: number;
}

/**
 * Generic LRU Cache with Time-To-Live (TTL) support.
 * Automatically evicts least recently used items when max size is reached.
 */
export class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private readonly maxSize: number;
  private readonly ttlMs: number;
  private hits = 0;
  private misses = 0;

  /**
   * Create a new LRU Cache.
   *
   * @param maxSize - Maximum number of entries to store (default: 1000)
   * @param ttlMs - Time-to-live in milliseconds (default: 300000 = 5 minutes)
   */
  constructor(maxSize = 1000, ttlMs = 300000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
  }

  /**
   * Get a value from the cache.
   * Returns null if the key doesn't exist or has expired.
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.misses++;
      return null;
    }

    const now = Date.now();

    // Check if expired
    if (now > entry.expiry) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }

    // Update last accessed time (for LRU)
    entry.lastAccessed = now;
    this.hits++;

    return entry.value;
  }

  /**
   * Set a value in the cache.
   * Evicts least recently used entries if cache is full.
   */
  set(key: string, value: T, customTtlMs?: number): void {
    const now = Date.now();
    const ttl = customTtlMs ?? this.ttlMs;

    // Evict expired entries first
    this.evictExpired();

    // If still at max capacity, evict LRU entries
    while (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      expiry: now + ttl,
      lastAccessed: now,
    });
  }

  /**
   * Check if a key exists in the cache and is not expired.
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);

    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete a specific key from the cache.
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all entries from the cache.
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get the current number of entries in the cache.
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics including hit rate.
   */
  getStats(): {
    size: number;
    maxSize: number;
    ttlMs: number;
    hits: number;
    misses: number;
    hitRate: number;
  } {
    const total = this.hits + this.misses;
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttlMs: this.ttlMs,
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0,
    };
  }

  /**
   * Reset hit/miss statistics.
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Evict all expired entries.
   */
  private evictExpired(): void {
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Evict the least recently used entry.
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}

// Import types and configuration
import type { MxCheck, DomainCheck, ValidationResult } from '@/types/email';
import { CACHE_CONFIG } from './constants';

/**
 * Cache for MX record lookups.
 * TTL: 5 minutes (MX records don't change frequently)
 */
export const mxCache = new LRUCache<MxCheck>(
  CACHE_CONFIG.mx.maxSize,
  CACHE_CONFIG.mx.ttlMs
);

/**
 * Cache for domain validation results.
 * TTL: 10 minutes
 */
export const domainCache = new LRUCache<DomainCheck>(
  CACHE_CONFIG.domain.maxSize,
  CACHE_CONFIG.domain.ttlMs
);

/**
 * Cache for full validation results.
 * TTL: 5 minutes
 */
export const resultCache = new LRUCache<ValidationResult>(
  CACHE_CONFIG.result.maxSize,
  CACHE_CONFIG.result.ttlMs
);

/**
 * Cache for catch-all detection results.
 * TTL: 1 hour (catch-all status rarely changes)
 */
export const catchAllCache = new LRUCache<boolean>(
  CACHE_CONFIG.catchAll.maxSize,
  CACHE_CONFIG.catchAll.ttlMs
);

/**
 * Cache for blacklist check results.
 * TTL: 30 minutes
 */
export const blacklistCache = new LRUCache<boolean>(
  CACHE_CONFIG.blacklist.maxSize,
  CACHE_CONFIG.blacklist.ttlMs
);

/**
 * Clear all caches. Useful for testing.
 */
export function clearAllCaches(): void {
  mxCache.clear();
  domainCache.clear();
  resultCache.clear();
  catchAllCache.clear();
  blacklistCache.clear();
}

/**
 * Get aggregated statistics for all caches.
 */
export function getAllCacheStats(): Record<string, ReturnType<LRUCache<unknown>['getStats']>> {
  return {
    mx: mxCache.getStats(),
    domain: domainCache.getStats(),
    result: resultCache.getStats(),
    catchAll: catchAllCache.getStats(),
    blacklist: blacklistCache.getStats(),
  };
}

/**
 * Reset statistics for all caches.
 */
export function resetAllCacheStats(): void {
  mxCache.resetStats();
  domainCache.resetStats();
  resultCache.resetStats();
  catchAllCache.resetStats();
  blacklistCache.resetStats();
}
