# Phase 1: Security & Critical Fixes

## Overview
This phase focuses on addressing security vulnerabilities and critical issues that could expose the application to attacks or abuse.

---

## Tasks Checklist

- [ ] 1.1 Implement Rate Limiting
- [ ] 1.2 Add Input Sanitization
- [ ] 1.3 Configure CORS
- [ ] 1.4 Add Security Headers
- [ ] 1.5 Implement API Key Authentication (Optional)
- [ ] 1.6 Add Request Validation Middleware
- [ ] 1.7 Write Security Tests

---

## 1.1 Implement Rate Limiting

### Description
The `RATE_LIMITS` constants exist but are never enforced. Implement actual rate limiting to prevent API abuse.

### Files to Modify
- `src/app/api/validate/route.ts`
- `src/app/api/validate-bulk/route.ts`
- Create: `src/lib/rate-limiter.ts`

### Implementation Details
```typescript
// src/lib/rate-limiter.ts
// Create an in-memory rate limiter using Map with IP tracking
// For production, use Redis-based solution

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

export function checkRateLimit(
  ip: string,
  limit: number,
  windowMs: number
): { allowed: boolean; remaining: number; resetTime: number }
```

### Tests Required
- Test rate limit enforcement
- Test window reset
- Test different IPs tracked separately

---

## 1.2 Add Input Sanitization

### Description
Sanitize email inputs to prevent XSS and injection attacks.

### Files to Modify
- `src/app/api/validate/route.ts`
- `src/app/api/validate-bulk/route.ts`
- Create: `src/lib/sanitize.ts`

### Implementation Details
```typescript
// src/lib/sanitize.ts
export function sanitizeEmail(email: string): string {
  // Remove HTML tags
  // Normalize unicode
  // Trim excessive whitespace
  // Limit length
}

export function sanitizeEmailArray(emails: string[]): string[] {
  // Apply sanitization to each email
  // Remove duplicates
  // Limit array size
}
```

---

## 1.3 Configure CORS

### Description
Add CORS configuration to control which origins can access the API.

### Files to Modify
- Create: `src/middleware.ts` or add to existing Next.js config

### Implementation Details
```typescript
// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Add CORS headers
  response.headers.set('Access-Control-Allow-Origin', process.env.ALLOWED_ORIGINS || '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
```

---

## 1.4 Add Security Headers

### Description
Add security headers to protect against common web vulnerabilities.

### Files to Modify
- `next.config.js` or `next.config.mjs`

### Implementation Details
```javascript
// next.config.js
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Content-Security-Policy', value: "default-src 'self'; ..." },
];

module.exports = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};
```

---

## 1.5 Implement API Key Authentication (Optional)

### Description
Add optional API key authentication for production use.

### Files to Create
- `src/lib/auth.ts`
- Modify API routes

### Implementation Details
```typescript
// src/lib/auth.ts
export function validateApiKey(request: NextRequest): boolean {
  const apiKey = request.headers.get('X-API-Key');
  if (!apiKey) return true; // Allow unauthenticated for public use

  // Validate against stored keys
  return isValidKey(apiKey);
}
```

---

## 1.6 Add Request Validation Middleware

### Description
Create reusable request validation using Zod schemas.

### Files to Create
- `src/lib/validation-schemas.ts`

### Implementation Details
```typescript
// src/lib/validation-schemas.ts
import { z } from 'zod';

export const singleEmailSchema = z.object({
  email: z.string().email().max(254),
});

export const bulkEmailSchema = z.object({
  emails: z.array(z.string().email().max(254)).min(1).max(1000),
});
```

---

## 1.7 Write Security Tests

### Description
Add tests specifically for security features.

### Files to Create
- `src/__tests__/security/rate-limiter.test.ts`
- `src/__tests__/security/sanitize.test.ts`

---

## Environment Variables Needed

Create `.env.example`:
```
# Rate Limiting
RATE_LIMIT_SINGLE=100
RATE_LIMIT_BULK=10
RATE_LIMIT_WINDOW_MS=60000

# CORS
ALLOWED_ORIGINS=http://localhost:3000

# API Authentication (Optional)
API_KEYS=key1,key2,key3
```

---

## Prompt for Claude Code

```
Execute Phase 1: Security & Critical Fixes for the Email Validator project.

Context:
- This is a Next.js 14 email validation application
- Rate limits are defined in src/lib/constants.ts but not enforced
- API routes are in src/app/api/

Tasks to complete in order:

1. Create src/lib/rate-limiter.ts with in-memory rate limiting
   - Track requests by IP address
   - Use RATE_LIMITS from constants
   - Return rate limit info in response headers

2. Create src/lib/sanitize.ts for input sanitization
   - sanitizeEmail function to clean single email
   - sanitizeEmailArray for bulk emails

3. Update src/app/api/validate/route.ts:
   - Import and use rate limiter
   - Import and use sanitizer
   - Add rate limit headers to response

4. Update src/app/api/validate-bulk/route.ts:
   - Same as above with bulk limits

5. Create src/middleware.ts for CORS and security headers

6. Update next.config.js with security headers

7. Create src/lib/validation-schemas.ts with Zod schemas

8. Create .env.example with all needed environment variables

9. Write tests:
   - src/__tests__/security/rate-limiter.test.ts
   - src/__tests__/security/sanitize.test.ts

10. Run all tests to verify nothing is broken

After each file creation/modification, ensure TypeScript compiles without errors.
Maintain existing functionality while adding security features.
```

---

## Verification Checklist

After completing this phase:
- [ ] `npm run lint` passes
- [ ] `npm run build` completes without errors
- [ ] `npm test` passes
- [ ] Rate limiting works (test with rapid requests)
- [ ] CORS headers present in API responses
- [ ] Security headers present on all pages
