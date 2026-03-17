# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev          # Start development server (port 3000)
npm run build        # Production build (standalone output for Docker)
npm run lint         # Run ESLint
npm run lint:strict  # ESLint with zero warnings allowed
npm run format       # Format code with Prettier
npm run format:check # Check formatting without changes
npx tsc --noEmit     # Type check without emitting
```

## Testing Commands

```bash
npm test                      # Run unit tests (Jest)
npm run test:watch            # Watch mode
npm run test:coverage         # With coverage report
npm test -- path/to/file      # Run single test file

npx playwright install        # Install browsers (first time only)
npm run test:e2e              # Run E2E tests (Playwright, starts dev server automatically)
npm run test:e2e:ui           # E2E with interactive UI
npm run test:all              # Run both unit and E2E tests
```

Unit tests are in `src/__tests__/` mirroring the source structure. E2E tests are in `e2e/`. Coverage thresholds are 70% (branches, functions, lines, statements). Coverage excludes `src/components/ui/**` (shadcn/ui), `page.tsx` files, `layout.tsx`, and `middleware.ts`.

## Architecture Overview

**Stack:** Next.js 14, React 18, TypeScript (strict), Tailwind CSS 3, Zustand, Zod, next-intl, next-pwa.

### Validation Pipeline

The core validation logic is in `src/lib/validators/`. The main orchestrator `index.ts` runs a multi-step pipeline:

1. **Cache check** — skipped if optional checks (smtp/auth/reputation/gravatar) are requested
2. **Request deduplication** — concurrent calls for the same email share one promise (`src/lib/request-dedup.ts`)
3. **Syntax** (`syntax.ts`) — synchronous, fail-fast if invalid
4. **Parallel async:** `Promise.all([validateDomain, validateMx, validateBlacklist])`
5. **Synchronous checks:** disposable, roleBased, typo, freeProvider, catchAll
6. **Score calculation** (additive, 0–100)
7. **Optional:** SMTP → Auth → Reputation → Gravatar → Custom Blacklist (sequential, each gated)

**Non-obvious orchestrator behaviors:**
- `isValid` requires `!typoCheck.hasTypo` — a domain typo makes the email "invalid" even if it would deliver
- SMTP only runs when MX records exist (`mxCheck.valid && mxCheck.records.length > 0`)
- SMTP `exists === false` caps score at 20 and forces `undeliverable`/`high` risk
- Custom blacklist hit forces score to 0; results with custom blacklists are never cached
- Auth bonus: +5 if auth score ≥ 80, −5 if auth score = 0
- Reputation < 40 caps score at 40; < 60 deducts 15

Shared regex patterns are in `patterns.ts`. All configuration lives in `src/lib/constants.ts`.

### DNS Resolution

DNS uses **DNS-over-HTTPS** (not Node's `dns` module). Three providers with automatic failover and circuit breaker: Google → Cloudflare → Quad9. CSP only allows `dns.google` from the browser — other DoH providers are server-side only.

**`domain.ts` is format-only** — it validates domain syntax via regex but does NOT perform DNS A-record lookups. `domainCheck.exists` is always `true` for valid-format domains. Actual domain existence is confirmed by MX record lookup.

### Scoring System

Score weights defined in `src/lib/constants.ts` (total = 100):

| Check | Weight |
|-------|--------|
| MX records | 25 |
| Syntax | 20 |
| Domain | 20 |
| Disposable | 15 |
| Typo | 10 |
| Role-based | 5 |
| Blacklist | 5 |

Risk thresholds: high < 50, medium 50–79, low ≥ 80.

### SMTP Verification

`src/lib/smtp/client.ts` uses raw TCP sockets (`net` module) for RCPT TO verification — **Node.js runtime only**, not Edge. Disabled by default. Includes SSRF protection (rejects private IPs, localhost, internal hostnames).

### Bulk Validation

- Pre-fetches unique domains to warm MX/domain caches before processing
- Processes in batches (default 50 emails, 50ms delay between batches)
- Jobs > 500 emails use an **in-memory job queue** (`src/lib/bulk-jobs.ts`) — not Redis-backed, lost on restart
- Max bulk size: 1000 emails. Bulk timeout: 55s (Vercel limit is 60s)

### Caching

All caches are in-memory LRU (`src/lib/cache.ts`):
- Validation results: 5 min / 1000 entries
- MX records: 5 min / 2000 entries
- Domain validation: 10 min / 2000 entries
- Catch-all: 1 hour / 500 entries
- Blacklist: 30 min / 1000 entries
- Negative DNS: 1 min / 500 entries

### State Management

Zustand stores in `src/stores/`:
- `validation-store` — current validation state
- `history-store` — validation history (persisted to localStorage)
- `analytics-store` — API usage analytics (persisted to localStorage)
- `admin-store` — admin dashboard state
- `blacklist-store`, `webhook-store` — feature-specific state

### Middleware

`src/middleware.ts` runs only on `/api/:path*`. Handles CORS and security headers. **In production with no `ALLOWED_ORIGINS` set, no CORS headers are sent** — external cross-origin requests will be blocked. `localhost:3000` is auto-allowed only in development.

### API Routes

- `POST /api/validate` — single email (options: `smtpCheck`, `authCheck`, `reputationCheck`, `gravatarCheck`)
- `POST /api/validate-bulk` — batch validation (array of emails)
- `GET /api/validate-bulk/jobs/[jobId]` — poll background job status
- `GET /api/health` — health check
- `POST /api/webhooks` — webhook management
- `POST /api/webhooks/test` — test webhook delivery
- `POST /api/csp-report` — CSP violation reporting
- `GET /api/google/contacts` — Google contacts (requires OAuth)

API routes have two-level validation: Zod schema (`parseSingleEmailRequest`) with XSS detection, then `sanitizeEmail()` before calling the validator.

### Security

`src/lib/security/`:
- `request-validator.ts` — header/body validation, JSON size limits
- `api-keys.ts` — API key management (parsed from `API_KEYS` env var, re-parsed every 60s)
- `auth.ts` — authentication middleware (opt-in via `API_KEY_REQUIRED=true`; same-origin requests bypass)
- `sanitize.ts` — XSS prevention, email plausibility checks

Rate limiting: in-memory sliding window, 100 req/min (single), 10 req/min (bulk). **Not shared across instances.**

### Key Types

All validation types in `src/types/email.ts`: `ValidationResult`, `ValidationChecks`, `DeliverabilityStatus` (deliverable | risky | undeliverable | unknown), `RiskLevel` (low | medium | high).

### Data Files

Static validation data in `src/lib/data/`: `disposable-domains.ts`, `free-providers.ts`, `role-emails.ts`, `common-typos.ts`. Update disposable list: `npm run update:domains`.

## Pages

- `/` — single email validation
- `/bulk` — CSV/TXT upload with batch validation and export
- `/history` — validation history (localStorage)
- `/api-docs` — Swagger UI
- `/tools` — email list cleaning
- `/import` — Google Contacts import
- `/admin` — admin dashboard (stats, logs, config, security events)
- `/analytics` — API usage analytics

## CLI Tool

Standalone CLI in `cli/` with its own `package.json` (no dependency on web app):
```bash
cd cli && npm install && npm run dev -- <email>
```

## SDKs

- **Node.js SDK:** `sdk/nodejs/`
- **Python SDK:** `sdk/python/` (sync + async)

## Internationalization

English and Arabic (RTL) via `next-intl`. Translations in `src/messages/`. i18n config entry point is `src/i18n.ts`. Locale resolved server-side in root layout.

## Coding Conventions

- `console.log` is disallowed by ESLint — use `console.error` or `console.warn`
- Unused function args must be prefixed with `_` (e.g., `_req`)
- Strict equality (`===`) enforced; curly braces required for all control flow
- `no-var` enforced
- Path alias: `@/` maps to `src/`
- `isolatedModules: true` — no `const enum` or cross-file namespace merging

## Environment Variables

Copy `.env.example` to `.env.local`. Key variables:

```
ALLOWED_ORIGINS=https://example.com    # CORS (required in production, comma-separated)
API_KEY_REQUIRED=false                 # Enable API key auth
API_KEYS=key:name:perms:tier[:expiry]  # Semicolon-separated keys
SMTP_TIMEOUT=5000                      # SMTP verification timeout
REPUTATION_API_KEY=...                 # Domain reputation API
GOOGLE_CLIENT_ID=...                   # Google Contacts OAuth
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

## Docker

```bash
npm run docker:build    # Build image
npm run docker:run      # Run container on port 3000
npm run docker:dev      # Development compose
npm run docker:prod     # Production compose (detached)
npm run docker:stop     # Stop containers
npm run docker:logs     # View logs
```

Published to GitHub Container Registry: `ghcr.io/mahmoodhamdi/email-validator:latest`.

## PWA

PWA is **disabled in development** — service worker only registers in production builds. `/api/validate` is `NetworkOnly` (never cached by service worker). Offline page at `/offline`.
