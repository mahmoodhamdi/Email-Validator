# Email Validator — أداة احترافية للتحقق من قوائم الإيميل

## للـ marketers وفرق الـ growth والـ SaaS اللي عاوزين تنظيف قوائم بريد

> أداة كاملة للتحقق من syntax + domain + MX + disposable + DMARC/SPF/DKIM.
> Web UI + REST API + CLI + bulk CSV upload. PWA installable. AR/EN bilingual.
> تركيب على دومين/سيرفر العميل خلال يوم عمل واحد.

---

## ليه Email Validator؟

| التحدي | اللي بيوفره النظام |
|--------|---------------------|
| 30-40% من قوائم الإيميل القديمة فيها bounces | فحص شامل قبل ما تبعت — توفير تكلفة الـ ESP |
| Spam traps في القوائم القديمة بتدمر sender reputation | disposable detection + DMARC check |
| لو موظف يدخل إيميل غلط في الـ form بسبب typo | typo suggestions (gmial → gmail) |
| الـ tools اللي في السوق (ZeroBounce, NeverBounce) بـ$0.01/email | نسخة self-hosted، تكلفة فقط الـ infra |
| GDPR/data residency بيمنع رفع قوائم لـ vendors خارجيين | كل شيء على infra العميل |

---

## الجمهور المستهدف

- **شركات SaaS** بقوائم customers/leads
- **Marketing agencies** بيشتغلوا لـ multiple clients
- **E-commerce** عندهم لـ newsletter
- **Tech startups** اللي بيدوروا product-market fit
- **HR teams** بيتحققوا من إيميلات candidates

---

## بترتكب في يوم واحد

| الساعة | النشاط |
|--------|--------|
| 1-2 | VPS + domain + TLS |
| 3 | Build + deploy Next.js app |
| 4 | API key generation + admin user |
| 5-6 | Training + first 100-email bulk test |
| 7-8 | Webhook integration مع الـ CRM/CDP اللي عند العميل |

---

## مميزات تميز Email Validator

### 1. Comprehensive validation chain
- **Syntax** (RFC 5322)
- **Domain** existence
- **MX records** lookup
- **Disposable** detection (500+ throwaway domains)
- **Role-based** detection (admin@, support@, info@)
- **Free provider** flag (Gmail, Yahoo, Outlook)
- **Typo suggestions** (gmial → gmail, yaho → yahoo)
- **SMTP handshake** (verify mailbox exists)
- **DMARC / SPF / DKIM** authentication checks
- **Domain reputation** scoring
- **Gravatar** detection

### 2. Multiple interfaces
- **Web UI** للـ single + bulk
- **REST API** للـ programmatic integration
- **CLI** لـ DevOps/scripts (`email-validator validate user@example.com`)
- **Webhooks** للـ notifications

### 3. Bulk capabilities
- Paste up to 10K emails at once
- CSV/TXT upload
- Real-time progress bar
- Export results to CSV / JSON
- Deduplicate + normalize before validation

### 4. PWA + offline
- Install كـ app على Desktop/Mobile
- Offline mode للـ basic syntax checks
- Push notifications للـ bulk job completion

### 5. Internationalization
- English + Arabic UI (RTL support)
- Saudi/Egypt/UAE date formats

### 6. Tests + Quality
- **1,224 unit tests** (61 suites, 3.7s)
- E2E tests بـ Playwright
- ESLint clean
- TypeScript strict mode

---

## الباقات

### Basic
**$1,200 / مرة واحدة + $50/شهر دعم**

- النظام كامل
- تركيب على VPS
- domain + TLS
- 100 emails/month rate limit (configurable up)
- ساعة تدريب
- 3 شهور warranty

### Pro
**$2,500 / مرة واحدة + $120/شهر دعم**

- استضافة جاهزة سنة
- branding customization
- webhook integration مع CRM واحد (HubSpot, Salesforce, Mailchimp)
- 10,000 emails/month
- 6 شهور دعم priority

### Enterprise
**$5,500+ / مرة واحدة + $250/شهر دعم**

- multi-tenant (per-customer API keys)
- white-label
- unlimited emails (rate-limited per key)
- ربط مع marketing automation moot
- SLA 99.5%
- 12 شهر دعم

---

## أسئلة شائعة

**س: SMTP verification بتقطع IP reputation بتاعنا؟**
ج: SMTP handshake بيستخدم HELO + RCPT TO بدون فعلياً ما يبعت email. مش بيعتبر spam. بس لو الـ IP بتاع العميل عليه history سيء، الـ remote servers ممكن يردوا تربية مختلفة. الـ Pro tier فيه IP routing optimization.

**س: GDPR / data residency؟**
ج: self-hosted بشكل كامل. مفيش data بتطلع من سيرفر العميل غير الـ DNS queries (للـ MX lookup).

**س: rate limits؟**
ج: configurable per-user وper-API-key. Basic 100/شهر، Pro 10K، Enterprise unlimited.

**س: lookup speed؟**
ج: 200-500ms per email (DNS + MX). bulk بـ parallel workers — 1000 email في < دقيقة.

---

## للتواصل

**Mahmoud Hamdy — MWM Software Solutions**
📧 mwm.softwars.solutions@gmail.com

Demo 20 دقيقة Zoom — بنوريك الـ web UI + الـ API + bulk validation حية.
