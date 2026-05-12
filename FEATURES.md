# Features Inventory — Email Validator

Legend: ✅ ships / 🟡 caveat / 🔵 optional / ⛔ out of scope

---

## Core Validation
| Feature | Status | Notes |
|---------|:------:|-------|
| Syntax (RFC 5322) | ✅ | |
| Domain existence | ✅ | DNS A/MX |
| MX record lookup | ✅ | |
| Disposable email detection | ✅ | 500+ domains, updatable list |
| Role-based detection | ✅ | admin@, support@, info@ |
| Free provider flag | ✅ | Gmail, Yahoo, Outlook, etc. |
| Typo suggestions | ✅ | gmial→gmail, yaho→yahoo |
| SMTP handshake verification | ✅ | mailbox existence |
| DMARC / SPF / DKIM check | ✅ | |
| Domain reputation scoring | 🟡 | basic; advanced = Enterprise |
| Gravatar detection | ✅ | |

## Interfaces
| Feature | Status | Notes |
|---------|:------:|-------|
| Web UI (Next.js) | ✅ | |
| REST API | ✅ | OpenAPI/Swagger docs |
| CLI (`email-validator` binary) | ✅ | in cli/ subdir |
| Webhook notifications | ✅ | |
| Postman collection | ✅ | docs/postman/ |

## Bulk Operations
| Feature | Status | Notes |
|---------|:------:|-------|
| Bulk paste (up to 10K) | ✅ | |
| CSV/TXT upload | ✅ | |
| Real-time progress | ✅ | |
| Export results (CSV/JSON) | ✅ | |
| Deduplicate + normalize | ✅ | |

## User Features
| Feature | Status | Notes |
|---------|:------:|-------|
| Validation history | ✅ | localStorage |
| Dark/Light mode | ✅ | |
| Mobile responsive | ✅ | |
| PWA installable | ✅ | offline syntax checks |
| Keyboard shortcuts | ✅ | press `?` |
| Email list cleaning | ✅ | dedup, normalize |
| Google Contacts import | ✅ | OAuth |

## Internationalization
| Feature | Status | Notes |
|---------|:------:|-------|
| English UI | ✅ | |
| Arabic UI + RTL | ✅ | |

## API & Integrations
| Feature | Status | Notes |
|---------|:------:|-------|
| Webhook events | ✅ | per-validation, bulk-job-complete |
| API rate limiting | ✅ | per user + per key |
| API key management UI | ✅ | admin dashboard |
| HubSpot integration | 🔵 | Pro tier |
| Mailchimp integration | 🔵 | Pro tier |
| Salesforce integration | 🔵 | Enterprise |

## Security & Ops
| Feature | Status | Notes |
|---------|:------:|-------|
| Rate limiting | ✅ | |
| API key auth | ✅ | |
| HTTPS-only | ✅ | |
| Audit log | ✅ | |
| Tests: 1224 passing | ✅ | 61 suites, 3.7s |
| ESLint clean | ✅ | |
| TypeScript strict | ✅ | |

## Out of Scope
| Feature | Why |
|---------|-----|
| Email sending | Different product class |
| Real-time bounce monitoring | Use a dedicated ESP analytics |
| AI-powered deliverability prediction | Custom development, Enterprise |
