# Customer Deployment Guide — Email Validator

## Scenario A — العميل عنده infrastructure

### يقدمه العميل
- VPS (1 vCPU / 2 GB RAM / 20 GB SSD)
- Domain + DNS
- Optional: Redis لكاش الـ DNS lookups

### نقدمه نحن
- ✅ Source code
- ✅ Dockerfile + docker-compose.yml
- ✅ env.example
- ✅ 60-min Zoom deployment session
- ✅ 60-min training
- ✅ Branding customization
- ✅ Support حسب الـ tier

### Timeline (1 day)
- VPS + DNS + TLS
- Build + deploy + first emails test
- Training + go-live

---

## Scenario B — إحنا اللي بنشتري ونجهز

### يقدمه العميل
- Domain (اختياري — لو موجود)
- بيانات الـ admin user

### نقدمه نحن (في Pro tier)
- ✅ كل اللي في Scenario A
- ✅ VPS purchase (DigitalOcean / Hetzner)
- ✅ Domain + Let's Encrypt
- ✅ Backup cron
- ✅ Monitoring

### تكاليف infra (Scenario B)
| البند | شهرياً |
|------|-------|
| VPS | $5-$10 |
| Domain | $1 (شهري متوسط) |
| Backups | $2 |

---

## Compliance + Security
- 🔒 TLS 1.2/1.3 + HSTS
- 🔒 Helmet security headers
- 🔒 Rate limiting per user + per IP
- 🔒 API key auth
- 🔒 No PII stored beyond validation history
- 🔒 Data residency: self-hosted, no external API calls beyond DNS

---

## التسليم
1. HANDOVER-CHECKLIST signed
2. Source ZIP + Docker images
3. Documentation pack
4. First-month support
