# Phase 1: Security

> **Priority:** CRITICAL
> **Status:** ✅ COMPLETED
> **Progress:** 4/4 Milestones Complete

---

## Overview

This phase focuses on securing the Email Validator API and preventing abuse. Currently, the API has no authentication, rate limiting can be bypassed, and input validation has gaps.

### Goals
- Implement API key authentication
- Fix rate limiting vulnerabilities
- Strengthen input validation
- Audit security headers

### Files to Modify
- `src/app/api/validate/route.ts`
- `src/app/api/validate-bulk/route.ts`
- `src/middleware.ts`
- `src/lib/rate-limiter.ts`
- `src/lib/security/` (new directory)
- `next.config.js`

---

## Milestone 1.1: API Authentication System

### Status: [x] Completed

### Problem
Anyone can call `/api/validate` and `/api/validate-bulk` without authentication. This exposes the service to:
- DDoS attacks
- Resource abuse
- Scraping/data harvesting

### Solution
Implement API key authentication with optional bypass for frontend.

### Tasks

```
[x] 1. Create API key management system
    - Create `src/lib/security/api-keys.ts`
    - Implement API key validation function
    - Support multiple API keys with different permissions
    - Add key expiration support

[x] 2. Create authentication middleware
    - Create `src/lib/security/auth.ts`
    - Check for `X-API-Key` header
    - Validate key against stored keys
    - Return 401 for invalid/missing keys
    - Allow bypass for same-origin requests (frontend)

[x] 3. Update API routes
    - Add auth check to `/api/validate`
    - Add auth check to `/api/validate-bulk`
    - Return proper error responses

[x] 4. Add environment variables
    - `API_KEYS` - Comma-separated list of valid API keys
    - `API_KEY_REQUIRED` - Enable/disable requirement
    - Update `.env.example` with documentation

[x] 5. Write tests
    - Test valid API key
    - Test invalid API key
    - Test missing API key
    - Test same-origin bypass
    - Test key expiration

[x] 6. Update API documentation
    - Document authentication in `/api-docs`
    - Add examples with API key header
```

### Implementation Details

#### API Key Structure
```typescript
interface APIKey {
  key: string;
  name: string;
  permissions: ('validate' | 'bulk' | 'admin')[];
  rateLimit?: number; // Override default rate limit
  expiresAt?: Date;
  createdAt: Date;
}
```

#### Authentication Flow
```
Request → Check X-API-Key header
  ├── Header missing?
  │   ├── Same-origin request? → Allow (frontend)
  │   └── External request? → 401 Unauthorized
  ├── Key invalid? → 401 Unauthorized
  ├── Key expired? → 401 Unauthorized
  └── Key valid? → Continue to route handler
```

#### Environment Variables
```env
# API Authentication
API_KEY_REQUIRED=true
API_KEYS=key1:name1:validate,bulk;key2:name2:validate
# Format: key:name:permissions;key:name:permissions
```

### Test Commands
```bash
npm test -- src/__tests__/security/
npm test -- --coverage --collectCoverageFrom='src/lib/security/**'
```

### Success Criteria
- [x] All API calls require valid API key (when enabled)
- [x] Frontend can still work without API key (same-origin)
- [x] Invalid keys return 401 with clear error message
- [x] Tests pass with >90% coverage
- [x] Documentation updated

---

## Milestone 1.2: Rate Limiting Improvements

### Status: [x] Completed

### Problem
Current rate limiting has vulnerabilities:
1. Client ID falls back to 'unknown' for localhost
2. No per-key rate limiting
3. Easy to bypass with proxy headers

### Solution
Implement robust client identification and per-key limits.

### Tasks

```
[x] 1. Improve client identification
    - Use combination of IP + User-Agent hash
    - Add session-based fallback
    - Remove trust of X-Forwarded-For without validation
    - Add fingerprinting for browsers

[x] 2. Implement per-key rate limits
    - Different limits per API key tier
    - Free tier: 100 requests/min
    - Pro tier: 1000 requests/min
    - Override via API key config

[x] 3. Add rate limit headers
    - X-RateLimit-Limit
    - X-RateLimit-Remaining
    - X-RateLimit-Reset
    - Retry-After (on 429)

[x] 4. Implement sliding window algorithm
    - Replace fixed window with sliding window
    - More accurate rate limiting
    - Prevent burst attacks at window boundaries

[x] 5. Add rate limit bypass for trusted IPs
    - Configure trusted IP ranges
    - Allow internal services to bypass

[x] 6. Write tests
    - Test rate limit enforcement
    - Test per-key limits
    - Test header responses
    - Test sliding window accuracy
```

### Implementation Details

#### Client ID Generation
```typescript
function getClientId(request: Request): string {
  const ip = getClientIP(request);
  const userAgent = request.headers.get('user-agent') || '';
  const apiKey = request.headers.get('x-api-key');

  if (apiKey) {
    return `key:${apiKey}`;
  }

  // Hash IP + UA for privacy
  return `client:${hash(ip + userAgent)}`;
}
```

#### Rate Limit Tiers
```typescript
const RATE_LIMITS = {
  anonymous: { requests: 20, window: 60000 },   // 20/min
  free: { requests: 100, window: 60000 },       // 100/min
  pro: { requests: 1000, window: 60000 },       // 1000/min
  enterprise: { requests: 10000, window: 60000 } // 10000/min
};
```

### Success Criteria
- [x] No rate limit bypass possible
- [x] Per-key rate limits working
- [x] Rate limit headers present
- [x] Tests pass (33 rate limiter tests)

---

## Milestone 1.3: Input Validation & Sanitization

### Status: [x] Completed

### Problem
Current input validation has gaps:
1. No maximum length on textarea input
2. Email parsing in bulk is simplistic
3. File upload has no size limit
4. Some XSS patterns might slip through

### Solution
Strengthen all input validation layers.

### Tasks

```
[x] 1. Add input length limits
    - Single email: max 254 characters
    - Bulk textarea: max 100KB
    - File upload: max 10MB
    - API request body: max 1MB

[x] 2. Improve email parsing
    - Use proper RFC 5322 parser for bulk
    - Handle quoted strings correctly
    - Handle comments in emails
    - Better CSV parsing

[x] 3. Strengthen sanitization
    - Add more XSS pattern detection
    - Sanitize file names
    - Validate Content-Type headers
    - Strip null bytes

[x] 4. Add request validation middleware
    - Validate Content-Type
    - Validate Content-Length
    - Reject malformed JSON
    - Add request size limits

[x] 5. Update Zod schemas
    - Add stricter email validation
    - Add array length limits
    - Add string length limits
    - Custom error messages

[x] 6. Write tests
    - Test length limit enforcement
    - Test XSS prevention
    - Test malformed input handling
    - Test file validation
```

### Implementation Details

#### Input Limits
```typescript
const INPUT_LIMITS = {
  email: {
    maxLength: 254,
    minLength: 5,
  },
  bulk: {
    maxEmails: 1000,
    maxTextareaSize: 100 * 1024, // 100KB
    maxFileSize: 10 * 1024 * 1024, // 10MB
  },
  request: {
    maxBodySize: 1024 * 1024, // 1MB
  },
};
```

#### Enhanced Sanitization
```typescript
function sanitizeEmail(email: string): string {
  return email
    .trim()
    .toLowerCase()
    .replace(/[\x00-\x1F\x7F]/g, '') // Control chars
    .replace(/<[^>]*>/g, '')          // HTML tags
    .replace(/javascript:/gi, '')      // JS protocol
    .replace(/data:/gi, '')            // Data protocol
    .replace(/vbscript:/gi, '')        // VB protocol
    .slice(0, INPUT_LIMITS.email.maxLength);
}
```

### Success Criteria
- [x] All inputs have enforced limits
- [x] XSS attacks blocked
- [x] Malformed requests rejected
- [x] Tests pass (569 total tests)

---

## Milestone 1.4: Security Headers & CORS Audit

### Status: [x] Completed

### Problem
Current security configuration needs review:
1. CSP allows unsafe-inline (required by Next.js but can be improved)
2. CORS might be too permissive
3. Some headers might be missing

### Solution
Audit and strengthen security headers.

### Tasks

```
[x] 1. Audit current CSP
    - Review unsafe-inline necessity
    - Add nonce-based scripts where possible
    - Tighten connect-src
    - Add report-uri for CSP violations

[x] 2. Review CORS configuration
    - List allowed origins explicitly
    - Remove wildcard if present
    - Add credentials handling
    - Test preflight requests

[x] 3. Add missing security headers
    - Cross-Origin-Embedder-Policy
    - Cross-Origin-Opener-Policy
    - Cross-Origin-Resource-Policy
    - Cache-Control for sensitive endpoints

[x] 4. Implement CSP reporting
    - Set up report endpoint
    - Log CSP violations
    - Alert on suspicious patterns

[x] 5. Add security.txt
    - Create /.well-known/security.txt
    - Add contact information
    - Add disclosure policy

[x] 6. Write tests
    - Test all security headers present
    - Test CORS enforcement
    - Test CSP blocking
```

### Implementation Details

#### Enhanced Security Headers
```typescript
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Required for Next.js
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self' https://dns.google",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "report-uri /api/csp-report",
    ].join('; '),
  },
  {
    key: 'Cross-Origin-Embedder-Policy',
    value: 'require-corp',
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'same-origin',
  },
];
```

#### CORS Configuration
```typescript
const corsConfig = {
  allowedOrigins: [
    process.env.NEXT_PUBLIC_APP_URL,
    'https://yourdomain.com',
  ],
  allowedMethods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-API-Key'],
  maxAge: 86400, // 24 hours
};
```

### Success Criteria
- [x] All security headers present and correct
- [x] CORS properly configured
- [x] CSP violations logged
- [x] Tests pass (588 total tests)

---

## Phase Completion Checklist

```
[x] Milestone 1.1: API Authentication System
[x] Milestone 1.2: Rate Limiting Improvements
[x] Milestone 1.3: Input Validation & Sanitization
[x] Milestone 1.4: Security Headers & CORS Audit
[x] All tests passing (843 unit tests + 76 E2E tests)
[x] Security audit passed (npm audit: 0 vulnerabilities)
[x] Documentation updated
```

## Commands to Run After Phase Completion

```bash
# Run all tests
npm run test:all

# Check for security vulnerabilities
npm audit

# Build and verify
npm run build

# Run E2E tests
npm run test:e2e
```

## Next Phase
After completing Phase 1, proceed to `plans/02-PHASE-PERFORMANCE.md`
