# Architecture Overview

This document provides a high-level overview of the Email Validator application architecture.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client (Browser)                         │
├─────────────────────────────────────────────────────────────────┤
│  React Components    │    Zustand Store    │    Hooks           │
│  - EmailValidator    │    - validation     │    - useDebounce   │
│  - BulkValidator     │    - history        │    - useToast      │
│  - ValidationResult  │                     │    - useValidator  │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTP/HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js Server                              │
├─────────────────────────────────────────────────────────────────┤
│  Middleware           │    API Routes       │    Validators     │
│  - Rate limiting      │    - /validate      │    - Syntax       │
│  - Request logging    │    - /validate-bulk │    - Domain       │
│                       │    - /health        │    - MX           │
│                       │                     │    - Disposable   │
│                       │                     │    - Blacklist    │
└─────────────────────────────────────────────────────────────────┘
```

## Core Components

### Frontend Layer

#### React Components (`src/components/`)

| Component | Purpose |
|-----------|---------|
| `EmailValidator` | Main single email validation form |
| `BulkValidator` | Bulk email validation with file upload |
| `ValidationResult` | Displays detailed validation results |
| `ValidationHistory` | Shows past validation history |
| `ScoreIndicator` | Visual score display (circular progress) |

#### State Management (`src/stores/`)

Uses **Zustand** for lightweight, TypeScript-friendly state:

```typescript
// Validation Store - Current validation state
{
  currentEmail: string,
  currentResult: ValidationResult | null,
  isValidating: boolean,
  error: string | null,
}

// History Store - Persisted to localStorage
{
  items: HistoryItem[],
  addItem: (result) => void,
  removeItem: (id) => void,
  clearHistory: () => void,
}
```

#### Custom Hooks (`src/hooks/`)

| Hook | Purpose |
|------|---------|
| `useDebounce` | Debounce values for real-time validation |
| `useEmailValidator` | Encapsulates validation API calls |
| `useLocalStorage` | Persist data to localStorage |
| `useToast` | Toast notification management |

### Backend Layer

#### API Routes (`src/app/api/`)

```
POST /api/validate      → Single email validation
POST /api/validate-bulk → Bulk email validation
GET  /api/health        → Health check
```

#### Middleware (`src/middleware.ts`)

- Rate limiting per client IP
- Request logging
- CORS handling

### Validation Engine

#### Validators (`src/lib/validators/`)

The validation pipeline runs multiple checks:

```
Email Input
    │
    ▼
┌─────────────────┐
│  Syntax Check   │ ← RFC 5322 compliance
└────────┬────────┘
         │ Valid?
         ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Domain Check   │────►│   MX Check      │────►│ Blacklist Check │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┴───────────────────────┘
                                 │
         ┌───────────────────────┴───────────────────────┐
         │                                               │
         ▼                                               ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Disposable Check│     │ Role-Based Check│     │   Typo Check    │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────────────────┴───────────────────────┘
                                 │
                                 ▼
                    ┌─────────────────────┐
                    │   Score Calculation │
                    │   & Risk Assessment │
                    └─────────────────────┘
```

#### Scoring Algorithm

Points are awarded for each passing check:

| Check | Points | Weight |
|-------|--------|--------|
| Syntax | 20 | 20% |
| Domain | 20 | 20% |
| MX Records | 25 | 25% |
| Not Disposable | 15 | 15% |
| Not Role-Based | 5 | 5% |
| No Typo | 10 | 10% |
| Not Blacklisted | 5 | 5% |

**Score Thresholds:**
- 80+ = Low risk (green)
- 50-79 = Medium risk (amber)
- <50 = High risk (red)

### Performance Optimizations

#### Caching (`src/lib/cache.ts`)

```typescript
// LRU Cache with TTL
{
  mx: { maxSize: 1000, ttlMs: 300000 },      // 5 min
  domain: { maxSize: 1000, ttlMs: 300000 },  // 5 min
  result: { maxSize: 500, ttlMs: 60000 },    // 1 min
}
```

#### Request Deduplication (`src/lib/request-dedup.ts`)

Prevents redundant concurrent validations for the same email:

```
Request 1: test@example.com → Starts validation
Request 2: test@example.com → Waits for Request 1
Request 3: test@example.com → Waits for Request 1
                              ← All receive same result
```

#### Bulk Processing (`src/lib/validators/index.ts`)

Bulk validation uses batching:
- Batch size: 10 emails
- Delay between batches: 100ms
- Parallel processing within each batch

## Data Flow

### Single Validation

```
1. User enters email
2. Client-side validation (zod schema)
3. POST to /api/validate
4. Middleware checks rate limit
5. Parse and sanitize input
6. Check cache for result
7. If not cached:
   a. Run all validators
   b. Calculate score
   c. Cache result
8. Return ValidationResult
9. Update UI with result
10. Add to history store
```

### Bulk Validation

```
1. User uploads file or pastes emails
2. Parse and deduplicate emails
3. POST to /api/validate-bulk
4. Process in batches of 10
5. Return array of ValidationResults
6. Update UI with summary
```

## Security Considerations

### Input Sanitization (`src/lib/sanitize.ts`)

- Email trimming and normalization
- Length validation (max 254 chars)
- Character filtering
- Duplicate removal for bulk

### Rate Limiting (`src/lib/rate-limiter.ts`)

- Per-client tracking via IP/identifier
- Sliding window algorithm
- Separate limits for single vs bulk
- Automatic cleanup of expired entries

### Error Handling (`src/lib/errors.ts`)

Custom error classes for:
- `ValidationError` - Input validation failures
- `RateLimitError` - Rate limit exceeded
- `ParseError` - JSON parsing failures

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript 5 |
| UI Library | React 18 |
| Styling | Tailwind CSS |
| Components | shadcn/ui + Radix UI |
| State | Zustand |
| Validation | Zod |
| Forms | React Hook Form |
| Animation | Framer Motion |
| Testing | Jest + Playwright |

## Extensibility

### Adding New Validators

1. Create validator in `src/lib/validators/`
2. Define types in `src/types/email.ts`
3. Import and call in `src/lib/validators/index.ts`
4. Update scoring weights if needed
5. Add tests

### Adding New UI Features

1. Create component in `src/components/`
2. Add to relevant page
3. Connect to store if needed
4. Add tests

### Adding New API Endpoints

1. Create route in `src/app/api/`
2. Add input validation
3. Implement error handling
4. Add to rate limiter if needed
5. Document in API spec

## Future Considerations

- SMTP verification for actual inbox checking
- International Domain Name (IDN) support
- Webhook notifications
- API key authentication
- Advanced analytics dashboard
- Email list cleaning service
