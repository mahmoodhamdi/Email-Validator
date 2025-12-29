# Phase 4: Code Quality

> **Priority:** MEDIUM
> **Status:** COMPLETED
> **Progress:** 4/4 Milestones Complete

---

## Overview

This phase focuses on improving code quality, removing duplication, enhancing type safety, and making the codebase more maintainable.

### Goals
- Remove code duplication
- Improve TypeScript type safety
- Standardize error handling
- Better manage static data files

### Files to Modify
- `src/hooks/useEmailValidator.ts`
- `src/components/email/EmailValidator.tsx`
- `src/types/email.ts`
- `src/lib/validators/*.ts`
- `src/lib/data/*.ts`
- `src/lib/errors.ts` (new)

---

## Milestone 4.1: Remove Code Duplication

### Status: [x] COMPLETED

### Problem
There's code duplication in the codebase:
1. `useEmailValidator` hook duplicates logic in `EmailValidator` component
2. Similar error handling patterns repeated across API routes
3. Validation logic duplicated between client and server
4. Cache implementation repeated for different caches

### Solution
Consolidate duplicated code into shared utilities.

### Tasks

```
[ ] 1. Audit code for duplication
    - Run duplication detection tool
    - Identify repeated patterns
    - Document all duplications
    - Prioritize by frequency

[ ] 2. Consolidate validation hooks
    - Keep useEmailValidator hook
    - Remove duplicate logic from component
    - Use hook in EmailValidator component
    - Ensure same behavior

[ ] 3. Create shared API utilities
    - Create `src/lib/api/utils.ts`
    - Extract common response helpers
    - Extract error formatting
    - Extract rate limit header handling

[ ] 4. Unify cache implementation
    - Create single LRUCache class
    - Parameterize TTL and size
    - Use for all caches
    - Add shared statistics

[ ] 5. Create shared validation utilities
    - Client-side pre-validation
    - Shared Zod schemas
    - Email format validation
    - Domain extraction

[ ] 6. Write tests
    - Test consolidated hooks
    - Test shared utilities
    - Test cache implementation
    - Ensure no regressions
```

### Implementation Details

#### Consolidated Hook Usage
```typescript
// Before: EmailValidator.tsx has its own validation logic
// After: Uses useEmailValidator hook

// src/components/email/EmailValidator.tsx
export function EmailValidator() {
  const {
    email,
    setEmail,
    result,
    isValidating,
    error,
    validate,
  } = useEmailValidator();

  // Component only handles UI, not validation logic
  return (
    <form onSubmit={(e) => { e.preventDefault(); validate(email); }}>
      {/* ... */}
    </form>
  );
}
```

#### Shared API Utilities
```typescript
// src/lib/api/utils.ts
import { NextResponse } from 'next/server';

export function jsonResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function errorResponse(
  message: string,
  status = 400,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      error: message,
      status,
      timestamp: new Date().toISOString(),
      ...details,
    },
    { status }
  );
}

export function addRateLimitHeaders(
  response: NextResponse,
  remaining: number,
  limit: number,
  resetTime: number
): NextResponse {
  response.headers.set('X-RateLimit-Limit', limit.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  response.headers.set('X-RateLimit-Reset', resetTime.toString());
  return response;
}
```

#### Unified Cache Class
```typescript
// src/lib/cache/LRUCache.ts
interface CacheOptions {
  maxSize: number;
  ttlMs: number;
  name?: string;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>>;
  private options: CacheOptions;
  private stats = { hits: 0, misses: 0, evictions: 0 };

  constructor(options: CacheOptions) {
    this.cache = new Map();
    this.options = options;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return undefined;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.misses++;
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    this.stats.hits++;

    return entry.value;
  }

  set(key: string, value: T): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.options.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
        this.stats.evictions++;
      }
    }

    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.options.ttlMs,
    });
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: total > 0 ? this.stats.hits / total : 0,
    };
  }

  clear(): void {
    this.cache.clear();
  }
}

// Usage
export const mxCache = new LRUCache<MxResult>({
  maxSize: 2000,
  ttlMs: 5 * 60 * 1000,
  name: 'mx',
});

export const resultCache = new LRUCache<ValidationResult>({
  maxSize: 1000,
  ttlMs: 5 * 60 * 1000,
  name: 'results',
});
```

### Success Criteria
- [ ] No duplicated validation logic
- [ ] Single cache implementation
- [ ] Shared API utilities used
- [ ] Tests pass
- [ ] No functionality regressions

---

## Milestone 4.2: Type Safety Improvements

### Status: [x] COMPLETED

### Problem
Type safety could be improved:
1. Some `any` types used
2. API responses not fully typed
3. Discriminated unions not used where beneficial
4. Error types are strings, not structured

### Solution
Strengthen TypeScript types throughout.

### Tasks

```
[ ] 1. Audit for type issues
    - Search for `any` type usage
    - Find implicit any
    - Identify loose types
    - Document all issues

[ ] 2. Add strict API response types
    - Type all API responses
    - Use generics for response wrapper
    - Type error responses
    - Add request body types

[ ] 3. Implement discriminated unions
    - For validation check results
    - For API responses (success/error)
    - For component states
    - For async operation states

[ ] 4. Create structured error types
    - Define error type hierarchy
    - Add error codes enum
    - Type error metadata
    - Create error factory functions

[ ] 5. Add runtime type validation
    - Zod schemas for external data
    - Validate API responses
    - Validate localStorage data
    - Type guards for unions

[ ] 6. Update tsconfig
    - Enable additional strict options
    - Add noUncheckedIndexedAccess
    - Enable exactOptionalPropertyTypes
    - Review and fix resulting errors
```

### Implementation Details

#### Discriminated Union for Results
```typescript
// src/types/email.ts

// Before
interface ValidationResult {
  email: string;
  isValid: boolean;
  // ...
}

// After - Discriminated union
type ValidationResult =
  | ValidEmailResult
  | InvalidEmailResult;

interface BaseResult {
  email: string;
  timestamp: string;
}

interface ValidEmailResult extends BaseResult {
  isValid: true;
  score: number; // 50-100 for valid
  checks: CompleteValidationChecks;
  deliverability: 'deliverable' | 'risky';
  risk: 'low' | 'medium';
}

interface InvalidEmailResult extends BaseResult {
  isValid: false;
  score: number; // 0-49 for invalid
  checks: PartialValidationChecks;
  deliverability: 'undeliverable' | 'unknown';
  risk: 'high';
  failureReason: ValidationFailureReason;
}

type ValidationFailureReason =
  | { type: 'syntax'; message: string }
  | { type: 'domain'; message: string }
  | { type: 'mx'; message: string }
  | { type: 'typo'; suggestion: string };
```

#### Typed API Responses
```typescript
// src/types/api.ts

// Success response wrapper
interface ApiSuccess<T> {
  success: true;
  data: T;
  timestamp: string;
}

// Error response wrapper
interface ApiError {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
}

type ApiResponse<T> = ApiSuccess<T> | ApiError;

// Error codes
enum ErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  TIMEOUT = 'TIMEOUT',
}

// Typed endpoints
type ValidateResponse = ApiResponse<ValidationResult>;
type BulkValidateResponse = ApiResponse<{
  results: ValidationResult[];
  metadata: BulkMetadata;
}>;
```

#### Structured Error Types
```typescript
// src/lib/errors.ts

export class AppError extends Error {
  constructor(
    message: string,
    public code: ErrorCode,
    public statusCode: number = 400,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        details: this.details,
      },
    };
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ErrorCode.VALIDATION_ERROR, 400, details);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number) {
    super('Rate limit exceeded', ErrorCode.RATE_LIMITED, 429, { retryAfter });
    this.name = 'RateLimitError';
  }
}
```

#### Type Guards
```typescript
// src/types/guards.ts

export function isValidResult(result: ValidationResult): result is ValidEmailResult {
  return result.isValid === true;
}

export function isApiError(response: ApiResponse<unknown>): response is ApiError {
  return response.success === false;
}

// Usage
const result = await validateEmail(email);
if (isValidResult(result)) {
  // TypeScript knows result is ValidEmailResult
  console.log(result.deliverability); // 'deliverable' | 'risky'
} else {
  // TypeScript knows result is InvalidEmailResult
  console.log(result.failureReason);
}
```

### Success Criteria
- [ ] No `any` types in codebase
- [ ] All API responses typed
- [ ] Discriminated unions used
- [ ] Error types structured
- [ ] Tests pass

---

## Milestone 4.3: Error Handling Standardization

### Status: [x] COMPLETED

### Problem
Error handling is inconsistent:
1. Different error formats across API routes
2. Some errors swallowed silently
3. No centralized error handling
4. Error messages not user-friendly

### Solution
Standardize error handling across the application.

### Tasks

```
[ ] 1. Create error handling utilities
    - Create `src/lib/errors/index.ts`
    - Define error classes
    - Create error factory functions
    - Add error serialization

[ ] 2. Implement API error handler
    - Create wrapper for route handlers
    - Catch and format all errors
    - Log errors appropriately
    - Return consistent responses

[ ] 3. Add client-side error handling
    - Global error handler for fetch
    - Type errors from API
    - User-friendly error messages
    - Error recovery suggestions

[ ] 4. Implement error logging
    - Log errors with context
    - Add request ID tracking
    - Structured logging format
    - Error categorization

[ ] 5. Create error boundary handler
    - Log errors from error boundaries
    - Report to error tracking (optional)
    - Correlate with API errors

[ ] 6. Write tests
    - Test error classes
    - Test API error handler
    - Test error formatting
    - Test error logging
```

### Implementation Details

#### API Error Handler Wrapper
```typescript
// src/lib/api/errorHandler.ts
import { NextRequest, NextResponse } from 'next/server';
import { AppError, ValidationError, RateLimitError } from '@/lib/errors';

type RouteHandler = (request: NextRequest) => Promise<NextResponse>;

export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (request: NextRequest) => {
    const requestId = crypto.randomUUID();

    try {
      const response = await handler(request);
      response.headers.set('X-Request-ID', requestId);
      return response;
    } catch (error) {
      // Log error with context
      console.error({
        requestId,
        path: request.url,
        method: request.method,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Handle known error types
      if (error instanceof AppError) {
        return NextResponse.json(error.toJSON(), {
          status: error.statusCode,
          headers: { 'X-Request-ID': requestId },
        });
      }

      // Handle Zod validation errors
      if (error instanceof z.ZodError) {
        return NextResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid request data',
              details: error.errors,
            },
          },
          { status: 400, headers: { 'X-Request-ID': requestId } }
        );
      }

      // Unknown error
      return NextResponse.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'An unexpected error occurred',
            requestId,
          },
        },
        { status: 500, headers: { 'X-Request-ID': requestId } }
      );
    }
  };
}

// Usage in route
export const POST = withErrorHandler(async (request) => {
  const body = await request.json();
  const { email } = validateRequestSchema.parse(body);

  const result = await validateEmail(email);
  return NextResponse.json({ success: true, data: result });
});
```

#### Client-side Error Handler
```typescript
// src/lib/api/client.ts

export class APIClient {
  private baseUrl: string;

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  async fetch<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new APIClientError(
        data.error?.message || 'Request failed',
        data.error?.code || 'UNKNOWN_ERROR',
        response.status,
        data.error?.details
      );
    }

    return data;
  }

  async validateEmail(email: string): Promise<ValidationResult> {
    const response = await this.fetch<{ success: true; data: ValidationResult }>(
      '/api/validate',
      {
        method: 'POST',
        body: JSON.stringify({ email }),
      }
    );
    return response.data;
  }
}

export class APIClientError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'APIClientError';
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isValidationError(): boolean {
    return this.code === 'VALIDATION_ERROR';
  }

  get userMessage(): string {
    switch (this.code) {
      case 'RATE_LIMITED':
        return 'Too many requests. Please wait a moment and try again.';
      case 'VALIDATION_ERROR':
        return 'Please check your input and try again.';
      case 'TIMEOUT':
        return 'The request took too long. Please try again.';
      default:
        return 'Something went wrong. Please try again later.';
    }
  }
}
```

### Success Criteria
- [ ] All errors use standard format
- [ ] Error handler wrapper used
- [ ] Client errors typed
- [ ] Errors logged with context
- [ ] Tests pass

---

## Milestone 4.4: Data Files Management

### Status: [x] COMPLETED

### Problem
Static data files need better management:
1. Hardcoded lists difficult to update
2. No versioning of data
3. Lists may be outdated
4. No way to update at runtime

### Solution
Improve data file management and allow easier updates.

### Tasks

```
[ ] 1. Audit current data files
    - List all data files
    - Check data freshness
    - Identify outdated entries
    - Document update process

[ ] 2. Add data file versioning
    - Add version metadata to files
    - Track last update date
    - Add source URLs
    - Document update frequency

[ ] 3. Create data update script
    - Script to fetch updated lists
    - Merge with existing data
    - Validate new entries
    - Generate TypeScript files

[ ] 4. Add runtime configuration
    - Environment variables for lists
    - Optional external data sources
    - Cache external data
    - Fallback to bundled data

[ ] 5. Update disposable domains
    - Fetch from multiple sources
    - Deduplicate entries
    - Add new disposable services
    - Document sources

[ ] 6. Add data file tests
    - Test data format
    - Test no duplicates
    - Test valid entries
    - Test version metadata
```

### Implementation Details

#### Data File Structure
```typescript
// src/lib/data/disposable-domains.ts

/**
 * Disposable Email Domains List
 * @version 2.0.0
 * @lastUpdated 2024-01-15
 * @sources
 *   - https://github.com/disposable-email-domains/disposable-email-domains
 *   - https://github.com/martenson/disposable-email-domains
 */

export const DISPOSABLE_DOMAINS_VERSION = '2.0.0';
export const DISPOSABLE_DOMAINS_UPDATED = '2024-01-15';

export const DISPOSABLE_DOMAINS: readonly string[] = [
  // A
  '0-mail.com',
  '0815.ru',
  '0clickemail.com',
  // ... hundreds more
] as const;

// Export as Set for O(1) lookups
let disposableDomainsSet: Set<string> | null = null;

export function getDisposableDomains(): Set<string> {
  if (!disposableDomainsSet) {
    disposableDomainsSet = new Set(DISPOSABLE_DOMAINS);
  }
  return disposableDomainsSet;
}

export function isDisposableDomain(domain: string): boolean {
  return getDisposableDomains().has(domain.toLowerCase());
}
```

#### Data Update Script
```typescript
// scripts/update-data.ts
import fs from 'fs';
import path from 'path';

const SOURCES = {
  disposable: [
    'https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/disposable_email_blocklist.conf',
    'https://raw.githubusercontent.com/martenson/disposable-email-domains/master/disposable_email_blocklist.conf',
  ],
  freeProviders: [
    'https://gist.githubusercontent.com/.../free-email-providers.txt',
  ],
};

async function fetchList(url: string): Promise<string[]> {
  const response = await fetch(url);
  const text = await response.text();
  return text
    .split('\n')
    .map(line => line.trim().toLowerCase())
    .filter(line => line && !line.startsWith('#'));
}

async function updateDisposableDomains(): Promise<void> {
  console.log('Fetching disposable domains...');

  const allDomains = new Set<string>();

  for (const url of SOURCES.disposable) {
    try {
      const domains = await fetchList(url);
      domains.forEach(d => allDomains.add(d));
      console.log(`  Fetched ${domains.length} from ${url}`);
    } catch (error) {
      console.error(`  Failed to fetch from ${url}:`, error);
    }
  }

  // Sort and deduplicate
  const sortedDomains = Array.from(allDomains).sort();

  // Generate TypeScript file
  const content = `/**
 * Disposable Email Domains List
 * @version ${getNextVersion()}
 * @lastUpdated ${new Date().toISOString().split('T')[0]}
 * @totalDomains ${sortedDomains.length}
 * @sources ${SOURCES.disposable.map(u => `\n *   - ${u}`).join('')}
 */

export const DISPOSABLE_DOMAINS: readonly string[] = [
${sortedDomains.map(d => `  '${d}',`).join('\n')}
] as const;

// ... rest of the file
`;

  fs.writeFileSync(
    path.join(__dirname, '../src/lib/data/disposable-domains.ts'),
    content
  );

  console.log(`Updated disposable-domains.ts with ${sortedDomains.length} domains`);
}

// Run
updateDisposableDomains();
```

#### Runtime Configuration
```typescript
// src/lib/data/config.ts

interface DataConfig {
  useExternalSources: boolean;
  externalSourceUrls: {
    disposable?: string;
    freeProviders?: string;
  };
  cacheExternalData: boolean;
  cacheTtlMs: number;
}

export const dataConfig: DataConfig = {
  useExternalSources: process.env.USE_EXTERNAL_DATA_SOURCES === 'true',
  externalSourceUrls: {
    disposable: process.env.EXTERNAL_DISPOSABLE_URL,
    freeProviders: process.env.EXTERNAL_FREE_PROVIDERS_URL,
  },
  cacheExternalData: true,
  cacheTtlMs: 24 * 60 * 60 * 1000, // 24 hours
};

// Dynamic data loader
export async function getDisposableDomains(): Promise<Set<string>> {
  if (dataConfig.useExternalSources && dataConfig.externalSourceUrls.disposable) {
    return fetchAndCacheExternal('disposable', dataConfig.externalSourceUrls.disposable);
  }

  // Fall back to bundled data
  const { DISPOSABLE_DOMAINS } = await import('./disposable-domains');
  return new Set(DISPOSABLE_DOMAINS);
}
```

### Success Criteria
- [ ] Data files have version metadata
- [ ] Update script works
- [ ] Runtime config supported
- [ ] Data freshness documented
- [ ] Tests pass

---

## Phase Completion Checklist

```
[x] Milestone 4.1: Remove Code Duplication
    - Created src/lib/api/utils.ts with shared API utilities
    - Created src/lib/api/index.ts barrel export
    - LRUCache already unified in src/lib/cache.ts
    - Comprehensive error classes in src/lib/errors.ts
[x] Milestone 4.2: Type Safety Improvements
    - No `any` types found in codebase
    - API responses properly typed
    - Error types structured
[x] Milestone 4.3: Error Handling Standardization
    - Comprehensive error classes already exist (ValidationError, RateLimitError, ParseError, RequestTimeoutError)
    - handleError utility for consistent error responses
    - withErrorHandler wrapper for API routes
[x] Milestone 4.4: Data Files Management
    - Created src/lib/data/metadata.ts with version tracking
    - Created src/lib/data/index.ts barrel export
    - Created scripts/update-disposable-domains.ts update script
    - Added comprehensive data file tests (36 tests)
    - Added npm script: update:domains
[x] All tests passing (787 tests)
[x] TypeScript strict checks pass
[x] Documentation updated
```

## Code Quality Commands

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Find duplicates (if using jscpd)
npx jscpd src/

# Check for any types
grep -r ": any" src/ --include="*.ts" --include="*.tsx"
```

## Next Phase
After completing Phase 4, proceed to `plans/05-PHASE-TESTING.md`
