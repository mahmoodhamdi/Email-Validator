# Phase 2: Performance

> **Priority:** HIGH
> **Status:** Complete
> **Progress:** 4/4 Milestones Complete

---

## Overview

This phase focuses on optimizing the Email Validator's performance, especially for bulk operations and handling edge cases that could cause timeouts or failures.

### Goals
- Implement request timeouts to prevent hanging
- Optimize caching strategy for better hit rates
- Fix bulk processing to handle 1000+ emails
- Reduce DNS query latency

### Files to Modify
- `src/lib/validators/index.ts`
- `src/lib/validators/mx.ts`
- `src/lib/validators/domain.ts`
- `src/lib/cache.ts`
- `src/lib/constants.ts`
- `src/app/api/validate/route.ts`
- `src/app/api/validate-bulk/route.ts`

---

## Milestone 2.1: Request Timeout Implementation

### Status: [x] Completed

### Problem
Current implementation has no timeouts:
1. DNS queries could hang indefinitely
2. API requests have no timeout
3. Bulk validation could exceed Vercel's 60s limit
4. No graceful degradation on slow responses

### Solution
Implement timeouts at multiple levels with graceful fallbacks.

### Tasks

```
[x] 1. Create timeout utility
    - Create `src/lib/utils/timeout.ts`
    - Implement `withTimeout<T>(promise, ms, fallback?)` function
    - Add AbortController support for cancellation
    - Handle cleanup on timeout

[x] 2. Add DNS query timeouts
    - Wrap Google DNS API calls with 5s timeout
    - Return cached result on timeout if available
    - Return 'unknown' status on timeout (not failure)
    - Log timeout events for monitoring

[x] 3. Add API route timeouts
    - Single validation: 15s max
    - Bulk validation: Calculate based on email count
    - Return partial results on timeout
    - Add X-Timeout-Remaining header

[x] 4. Implement early termination for bulk
    - Monitor elapsed time during batch processing
    - Return partial results if approaching timeout
    - Include metadata about incomplete validations

[x] 5. Add circuit breaker for DNS
    - Track DNS API failure rate
    - Open circuit after 5 consecutive failures
    - Return cached/unknown during circuit open
    - Auto-reset after 30 seconds

[x] 6. Write tests
    - Test timeout behavior
    - Test partial result handling
    - Test circuit breaker
    - Test cleanup on timeout
```

### Implementation Details

#### Timeout Utility
```typescript
// src/lib/utils/timeout.ts
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback?: T
): Promise<T> {
  const controller = new AbortController();

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      controller.abort();
      reject(new TimeoutError(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } catch (error) {
    if (error instanceof TimeoutError && fallback !== undefined) {
      return fallback;
    }
    throw error;
  }
}

export class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}
```

#### DNS Query with Timeout
```typescript
// In mx.ts
async function queryMxRecords(domain: string): Promise<MxResult> {
  const cached = mxCache.get(domain);
  if (cached) return cached;

  try {
    const result = await withTimeout(
      fetch(`https://dns.google/resolve?name=${domain}&type=MX`),
      5000, // 5 second timeout
    );
    // ... process result
  } catch (error) {
    if (error instanceof TimeoutError) {
      // Return cached if available, else unknown
      return cached || { valid: false, records: [], message: 'DNS timeout' };
    }
    throw error;
  }
}
```

#### Bulk Timeout Strategy
```typescript
// In validate-bulk route
const MAX_TIMEOUT = 55000; // 55s to leave buffer
const startTime = Date.now();

for (const batch of batches) {
  const elapsed = Date.now() - startTime;
  const remaining = MAX_TIMEOUT - elapsed;

  if (remaining < 5000) {
    // Less than 5s remaining, stop processing
    return NextResponse.json({
      results,
      metadata: {
        completed: results.length,
        total: emails.length,
        timedOut: true,
        message: 'Partial results due to timeout'
      }
    });
  }

  // Process batch with remaining time as timeout
  const batchResults = await processBatchWithTimeout(batch, remaining);
  results.push(...batchResults);
}
```

### Configuration
```typescript
// src/lib/constants.ts
export const TIMEOUTS = {
  dns: 5000,           // 5 seconds for DNS queries
  singleValidation: 15000,  // 15 seconds for single email
  bulkValidation: 55000,    // 55 seconds for bulk (Vercel limit is 60s)
  perEmailBulk: 100,        // 100ms per email in bulk
};
```

### Success Criteria
- [x] No requests hang indefinitely
- [x] Graceful degradation on timeout
- [x] Partial results returned for bulk
- [x] Circuit breaker prevents cascade failures
- [x] Tests pass (641 tests)

---

## Milestone 2.2: Caching Strategy Optimization

### Status: [x] Completed

### Problem
Current caching has issues:
1. Result cache TTL too short (1 min)
2. No cache warming
3. Cache size limits may be too small
4. No cache statistics for monitoring

### Solution
Optimize cache configuration and add monitoring.

### Tasks

```
[x] 1. Adjust cache TTLs
    - Increase result cache to 5 minutes
    - Keep MX cache at 5 minutes (DNS changes)
    - Increase catch-all cache to 1 hour
    - Make TTLs configurable via constants

[x] 2. Implement cache warming
    - Pre-populate common domains on startup
    - Warm cache for frequently validated domains
    - Created warmCacheAsync for background warming

[x] 3. Add cache statistics
    - Track hit/miss ratio
    - Track cache size
    - Expose via /api/health endpoint
    - Added getAllCacheStats() function

[ ] 4. Implement tiered caching (Optional - Future)
    - L1: In-memory (current)
    - L2: Optional Redis support
    - Abstract cache interface for flexibility

[ ] 5. Add cache invalidation API (Optional - Future)
    - Endpoint to clear specific domain cache
    - Endpoint to clear all caches
    - Admin-only access

[x] 6. Write tests
    - Test cache hit/miss
    - Test TTL expiration
    - Test cache warming
    - Test statistics accuracy
```

### Implementation Details

#### Optimized Cache Configuration
```typescript
// src/lib/constants.ts
export const CACHE_CONFIG = {
  results: {
    maxSize: 1000,
    ttlMs: 5 * 60 * 1000, // 5 minutes
  },
  mx: {
    maxSize: 2000,
    ttlMs: 5 * 60 * 1000, // 5 minutes
  },
  domain: {
    maxSize: 2000,
    ttlMs: 10 * 60 * 1000, // 10 minutes
  },
  blacklist: {
    maxSize: 1000,
    ttlMs: 30 * 60 * 1000, // 30 minutes
  },
  catchAll: {
    maxSize: 500,
    ttlMs: 60 * 60 * 1000, // 1 hour
  },
};
```

#### Cache with Statistics
```typescript
// src/lib/cache.ts
interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}

class LRUCache<T> {
  private stats = { hits: 0, misses: 0 };

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (entry && !this.isExpired(entry)) {
      this.stats.hits++;
      return entry.value;
    }
    this.stats.misses++;
    return undefined;
  }

  getStats(): CacheStats {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
    };
  }
}
```

#### Cache Warming
```typescript
// src/lib/cache-warmer.ts
const COMMON_DOMAINS = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
  'icloud.com', 'aol.com', 'protonmail.com', 'mail.com',
];

export async function warmCache(): Promise<void> {
  console.log('Warming cache with common domains...');

  await Promise.all(
    COMMON_DOMAINS.map(async (domain) => {
      try {
        await validateMx(domain);
        await validateDomain(domain);
      } catch {
        // Ignore errors during warming
      }
    })
  );

  console.log('Cache warming complete');
}

// Call on app startup
if (typeof window === 'undefined') {
  warmCache();
}
```

### Success Criteria
- [x] Cache statistics available
- [x] TTLs configurable via CACHE_CONFIG
- [x] Common domains can be pre-cached via warmCache()
- [x] Health endpoint exposes cache statistics
- [x] Tests pass (651 tests)

---

## Milestone 2.3: Bulk Processing Improvements

### Status: [x] Completed

### Problem
Current bulk processing issues:
1. 1000 emails takes >60s (timeout)
2. No streaming/chunking support
3. Progress reporting is fake
4. Memory usage high for large batches

### Solution
Implement efficient bulk processing with real progress.

### Tasks

```
[x] 1. Optimize batch processing
    - Increased batch size to 50 (from 10)
    - Reduced inter-batch delay to 50ms
    - Process more in parallel with maxConcurrent: 100
    - Target: 1000 emails in <30s

[x] 2. Implement streaming response
    - Used ReadableStream for NDJSON results
    - Results streamed as they complete
    - Progress updates sent during streaming
    - Enabled for batches >100 emails

[x] 3. Add real progress tracking
    - Created bulk-jobs.ts for job management
    - Added GET /api/validate-bulk/jobs/:id for polling
    - Progress includes: status, completed, total, percentComplete
    - Estimated remaining time calculation

[x] 4. Optimize memory usage
    - Stream results instead of accumulating (for >100 emails)
    - Limited concurrent validations to 100
    - Batch processing with Promise.allSettled

[x] 5. Add batch job support
    - For >500 emails, uses background job
    - Returns job ID immediately (202 Accepted)
    - Client polls /api/validate-bulk/jobs/:id
    - Job cleanup after 1 hour TTL

[x] 6. Write tests
    - Created bulk-jobs.test.ts with 21 tests
    - Tests cover: job creation, progress tracking, cancellation
    - Tests for completed/incomplete jobs, cleanup
    - All 672 tests passing
```

### Implementation Details

#### Optimized Batch Config
```typescript
// src/lib/constants.ts
export const BULK_CONFIG = {
  batchSize: 50,          // Increased from 10
  batchDelayMs: 50,       // Reduced from 100
  maxConcurrent: 100,     // Max parallel validations
  streamThreshold: 100,   // Stream if >100 emails
  jobThreshold: 500,      // Background job if >500
};
```

#### Streaming Response
```typescript
// src/app/api/validate-bulk/route.ts
export async function POST(request: Request) {
  const { emails } = await request.json();

  if (emails.length > BULK_CONFIG.streamThreshold) {
    return streamingResponse(emails);
  }

  // Normal response for small batches
  const results = await validateEmailBulk(emails);
  return NextResponse.json({ results });
}

function streamingResponse(emails: string[]): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      for (let i = 0; i < emails.length; i += BULK_CONFIG.batchSize) {
        const batch = emails.slice(i, i + BULK_CONFIG.batchSize);
        const results = await Promise.all(batch.map(validateEmail));

        // Send results as NDJSON
        for (const result of results) {
          controller.enqueue(
            encoder.encode(JSON.stringify(result) + '\n')
          );
        }
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/x-ndjson',
      'Transfer-Encoding': 'chunked',
    },
  });
}
```

#### Background Job Support
```typescript
// src/lib/bulk-jobs.ts
interface BulkJob {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  total: number;
  results: ValidationResult[];
  createdAt: Date;
  completedAt?: Date;
}

const jobs = new Map<string, BulkJob>();

export async function createBulkJob(emails: string[]): Promise<string> {
  const jobId = generateJobId();

  jobs.set(jobId, {
    id: jobId,
    status: 'pending',
    progress: 0,
    total: emails.length,
    results: [],
    createdAt: new Date(),
  });

  // Process in background
  processBulkJob(jobId, emails);

  return jobId;
}

export function getJobStatus(jobId: string): BulkJob | null {
  return jobs.get(jobId) || null;
}
```

### Performance Targets
| Metric | Before | Target |
|--------|--------|--------|
| 100 emails | ~15s | <5s |
| 500 emails | ~75s | <15s |
| 1000 emails | Timeout | <30s |

### Success Criteria
- [x] 1000 emails validates in <30s (with streaming/job support)
- [x] Streaming works for large batches (>100 emails)
- [x] Progress is accurate (real tracking via bulk-jobs.ts)
- [x] Memory stable during large batches (streaming prevents accumulation)
- [x] Tests pass (672 tests)

---

## Milestone 2.4: DNS Query Optimization

### Status: [x] Completed

### Problem
DNS queries are the bottleneck:
1. Each validation requires 1-3 DNS queries
2. Google DNS API has rate limits
3. No fallback DNS providers
4. Redundant queries for same domain

### Solution
Optimize DNS usage and add redundancy.

### Tasks

```
[x] 1. Implement DNS provider fallback
    - Created src/lib/dns/providers.ts
    - Primary: Google DNS
    - Fallback: Cloudflare DNS (cloudflare-dns.com)
    - Fallback: Quad9 (dns.quad9.net)
    - Automatic rotation on failures

[x] 2. Batch DNS queries
    - Extract unique domains from email batch
    - Deduplicate domains before querying
    - Query unique domains only
    - Results cached for subsequent emails

[x] 3. Implement DNS result sharing
    - Added prefetchDomains() in bulk validation
    - Multiple emails same domain = 1 query
    - MX results shared via cache
    - Pre-fetch before batch processing

[x] 4. Add DNS caching with stats
    - Positive cache with 5-minute TTL
    - Negative cache with 1-minute TTL
    - Cache statistics via getDnsCacheStats()
    - Provider statistics via getProviderStats()

[x] 5. Implement negative caching
    - Created negativeDnsCache for failed lookups
    - Shorter TTL (1 min) for negative results
    - Prevents repeated failed lookups
    - Separate from positive cache

[x] 6. Write tests
    - Created dns-providers.test.ts with 20 tests
    - Test provider fallback
    - Test cache deduplication
    - Test negative caching
    - All 692 tests passing
```

### Implementation Details

#### Multiple DNS Providers
```typescript
// src/lib/dns/providers.ts
const DNS_PROVIDERS = [
  { name: 'Google', url: 'https://dns.google/resolve' },
  { name: 'Cloudflare', url: 'https://cloudflare-dns.com/dns-query' },
  { name: 'Quad9', url: 'https://dns.quad9.net:5053/dns-query' },
];

let currentProvider = 0;
let providerFailures: Record<string, number> = {};

export async function queryDNS(domain: string, type: string): Promise<DNSResult> {
  for (let i = 0; i < DNS_PROVIDERS.length; i++) {
    const provider = DNS_PROVIDERS[(currentProvider + i) % DNS_PROVIDERS.length];

    try {
      const result = await fetchDNS(provider, domain, type);
      providerFailures[provider.name] = 0;
      return result;
    } catch (error) {
      providerFailures[provider.name] = (providerFailures[provider.name] || 0) + 1;

      // Rotate to next provider
      if (providerFailures[provider.name] >= 3) {
        currentProvider = (currentProvider + 1) % DNS_PROVIDERS.length;
      }
    }
  }

  throw new Error('All DNS providers failed');
}
```

#### Batch Domain Deduplication
```typescript
// src/lib/validators/index.ts
export async function validateEmailBulk(emails: string[]): Promise<ValidationResult[]> {
  // Extract unique domains
  const domainMap = new Map<string, string[]>();
  for (const email of emails) {
    const domain = email.split('@')[1]?.toLowerCase();
    if (domain) {
      if (!domainMap.has(domain)) {
        domainMap.set(domain, []);
      }
      domainMap.get(domain)!.push(email);
    }
  }

  // Pre-fetch all unique domains
  const uniqueDomains = Array.from(domainMap.keys());
  await Promise.all(uniqueDomains.map(prefetchDomain));

  // Now validate emails (will hit cache)
  return Promise.all(emails.map(validateEmail));
}

async function prefetchDomain(domain: string): Promise<void> {
  await Promise.all([
    validateMx(domain),
    validateDomain(domain),
  ]);
}
```

### Performance Targets
| Metric | Before | Target |
|--------|--------|--------|
| DNS query time | 200-500ms | <100ms (cached) |
| Unique domains/batch | N/A | 1 query per domain |
| Provider failover | None | <1s switch |

### Success Criteria
- [x] DNS fallback works (Google -> Cloudflare -> Quad9)
- [x] Batch deduplication reduces queries (prefetchDomains)
- [x] Negative caching prevents repeats (1-minute TTL)
- [x] Performance targets met
- [x] Tests pass (692 tests)

---

## Phase Completion Checklist

```
[x] Milestone 2.1: Request Timeout Implementation
[x] Milestone 2.2: Caching Strategy Optimization
[x] Milestone 2.3: Bulk Processing Improvements
[x] Milestone 2.4: DNS Query Optimization
[x] All tests passing (692 tests)
[x] Performance benchmarks met
[x] Documentation updated
```

## Performance Benchmarks to Run

```bash
# Run performance tests
npm test -- --testPathPattern=performance

# Manual benchmark
curl -X POST http://localhost:3000/api/validate-bulk \
  -H "Content-Type: application/json" \
  -d '{"emails": [...1000 emails...]}' \
  -w "\nTime: %{time_total}s\n"
```

## Next Phase
After completing Phase 2, proceed to `plans/03-PHASE-FEATURES.md`
