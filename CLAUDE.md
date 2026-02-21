# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
npm run dev          # Start development server (port 3000)
npm run build        # Production build
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

Unit tests are in `src/__tests__/` mirroring the source structure. E2E tests are in `e2e/`. Coverage thresholds are 70% (branches, functions, lines, statements).

## Architecture Overview

### Validation Pipeline

The core validation logic is in `src/lib/validators/`. The main orchestrator `index.ts` runs a multi-step validation pipeline:

1. **Syntax validation** (`syntax.ts`) - RFC 5322 regex, parses local part and domain
2. **Domain validation** (`domain.ts`) - Checks domain exists via DNS
3. **MX validation** (`mx.ts`) - MX record lookup for mail servers
4. **Disposable detection** (`disposable.ts`) - Checks against 500+ temp email domains
5. **Role-based detection** (`role-based.ts`) - Detects prefixes like admin@, support@
6. **Typo suggestion** (`typo.ts`) - Maps common typos (gmial.com → gmail.com)
7. **Free provider detection** (`free-provider.ts`) - Identifies Gmail, Yahoo, etc.
8. **Blacklist check** (`blacklist.ts`) - Known spam source checking
9. **Catch-all detection** (`catch-all.ts`) - Domains that accept all emails
10. **SMTP verification** (`smtp.ts`) - Optional mailbox existence check via SMTP
11. **Authentication** (`authentication.ts`) - SPF/DMARC/DKIM record validation
12. **Reputation** (`reputation.ts`) - Domain reputation scoring
13. **Gravatar** (`gravatar.ts`) - Gravatar profile detection
14. **Custom blacklist** (`custom-blacklist.ts`) - User-defined blacklist checking

Shared patterns are centralized in `patterns.ts` (RFC 5322 email regex, domain regex).

Each validator returns a typed check result. The orchestrator combines these into a `ValidationResult` with a score (0-100), deliverability status, and risk level. Async checks (domain, MX, blacklist) run in parallel for performance.

### SMTP Verification

The SMTP client in `src/lib/smtp/` performs mailbox existence verification:
- `client.ts` - SMTP connection and RCPT TO verification
- `types.ts` - SMTPCheckResult type definitions

SMTP verification is optional (disabled by default) and can detect:
- Non-existent mailboxes (confirmed undeliverable)
- Catch-all servers (accepts all addresses)
- Greylisting (temporary rejection)

The SMTP client includes SSRF protection via MX hostname validation (rejects private IPs, localhost, internal domains).

### Security

Security utilities in `src/lib/security/`:
- `request-validator.ts` - Request header/body validation, JSON parsing with size limits
- `api-keys.ts` - API key management
- `auth.ts` - Authentication middleware
- `sanitize.ts` - Input sanitization (XSS prevention, email plausibility checks)

### Email List Cleaning

The `src/lib/cleaning/` module provides email list management:
- `cleaner.ts` - Deduplication, normalization, and merging of email lists
- `types.ts` - Cleaning operation types and options

### Scoring System

Score weights are defined in `src/lib/constants.ts`:
- MX records: 25% (most critical for deliverability)
- Syntax + Domain: 20% each (basic validity)
- Disposable: 15% (abuse prevention)
- Typo: 10% (user mistake detection)
- Role-based + Blacklist: 5% each (quality indicators)

Risk thresholds: high < 50, medium 50-79, low ≥ 80

### Caching & Performance

- `src/lib/cache.ts` - LRU result cache for repeated validations
- `src/lib/request-dedup.ts` - Deduplicates concurrent requests for same email
- `src/lib/constants.ts` - All configuration: scoring weights, thresholds, timeouts, rate limits, cache TTLs, bulk config

Bulk validation pre-fetches unique domains to reduce redundant DNS queries and processes in configurable batches (default: 50 emails per batch). Circuit breaker pattern protects against DNS service failures.

### Data Files

Static validation data is in `src/lib/data/`:
- `disposable-domains.ts` - Blocklist of temporary email domains
- `free-providers.ts` - List of free email providers
- `role-emails.ts` - Role-based email prefixes
- `common-typos.ts` - Domain typo mappings

To update disposable domains list from external sources: `npm run update:domains`

### State Management

Uses Zustand for state:
- `src/stores/validation-store.ts` - Current validation state
- `src/stores/history-store.ts` - Validation history (persisted to localStorage)
- `src/stores/analytics-store.ts` - API usage analytics (persisted)
- `src/stores/admin-store.ts` - Admin dashboard state (validation logs, config, security events)

### Middleware

`src/middleware.ts` runs only on `/api/:path*` routes. It handles CORS (configured via `ALLOWED_ORIGINS` env var) and sets security headers. In development, `localhost:3000` is allowed by default.

### API Routes

- `POST /api/validate` - Single email validation (supports `smtpCheck`, `authCheck`, `reputationCheck`, `gravatarCheck` options)
- `POST /api/validate-bulk` - Batch validation (array of emails)
- `GET /api/validate-bulk/jobs/[jobId]` - Get bulk validation job status
- `GET /api/health` - Health check endpoint
- `POST /api/webhooks` - Webhook management
- `POST /api/webhooks/test` - Test webhook delivery
- `POST /api/csp-report` - CSP violation reporting
- `GET /api/google/contacts` - Fetch Google contacts (requires OAuth)

### Pages

- `/` - Single email validation with real-time results
- `/bulk` - Bulk validation with CSV/TXT upload and export
- `/history` - Validation history from localStorage
- `/api-docs` - API documentation (Swagger UI)
- `/tools` - Email list cleaning tools
- `/import` - Google Contacts import
- `/admin` - Admin dashboard (system stats, validation logs, config, security events, reports)

### Key Types

All validation types are in `src/types/email.ts`:
- `ValidationResult` - Complete validation response
- `ValidationChecks` - All individual check results
- `DeliverabilityStatus` - deliverable | risky | undeliverable | unknown
- `RiskLevel` - low | medium | high

## CLI Tool

A standalone CLI tool exists in `cli/` with its own package.json:
```bash
cd cli
npm install
npm run build
npm run dev -- <email>    # Test directly with ts-node
```
The CLI implements its own lightweight validation logic (no dependency on web app).

## Path Alias

Use `@/` to import from `src/`. Example: `import { validateEmail } from '@/lib/validators'`

## Internationalization

The app supports English and Arabic (with RTL). Translation files are in `src/messages/`. Uses `next-intl` for i18n.

## Coding Conventions

- `console.log` is disallowed by ESLint. Use `console.error` or `console.warn` instead.
- Unused function args must be prefixed with `_` (e.g., `_req`).
- Strict equality (`===`) is enforced. Curly braces required for all control flow blocks.

## Environment Variables

For Google Contacts import, set in `.env.local`:
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
```

Optional configuration:
```
ALLOWED_ORIGINS=https://example.com,https://other.com  # CORS origins (comma-separated)
SMTP_TIMEOUT=5000                                       # SMTP verification timeout
REPUTATION_API_KEY=...                                  # Domain reputation API key
CSP_REPORT_URI=/api/csp-report                         # CSP violation report endpoint
```

## Docker

```bash
npm run docker:build       # Build image
npm run docker:run         # Run container
npm run docker:prod        # Run with docker-compose (detached)
npm run docker:dev         # Run development compose
npm run docker:stop        # Stop containers
npm run docker:logs        # View logs
```
