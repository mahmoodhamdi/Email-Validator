# Handover Checklist — Email Validator

**Project**: Email Validator
**Client**: ___________________________
**Delivery date**: ____ / ____ / ______
**Tier**: ☐ Basic / ☐ Pro / ☐ Enterprise

---

## Infrastructure
- [ ] VPS (1 vCPU / 2 GB RAM / 20 GB SSD min)
- [ ] Ubuntu 22.04 / 24.04 patched
- [ ] ufw firewall
- [ ] Fail2ban
- [ ] Timezone Africa/Cairo

## Domain + TLS
- [ ] DNS A record
- [ ] Let's Encrypt + auto-renew
- [ ] HSTS + HTTPS redirect

## Next.js App
- [ ] Node 20+
- [ ] `npm ci` succeeded
- [ ] `.env` configured (rate limits, API keys, optional Redis URL)
- [ ] `npm run build` succeeded
- [ ] systemd service or PM2
- [ ] Nginx reverse-proxy

## Configuration
- [ ] Admin user created
- [ ] API keys generated for customer's integrations
- [ ] Rate limits configured (per user / per IP)
- [ ] Optional: Custom disposable domains list seeded
- [ ] Optional: Webhook endpoints registered

## Security
- [ ] npm audit clean
- [ ] `.env` chmod 600
- [ ] Default admin password CHANGED
- [ ] Rate limiting verified

## Training
- [ ] Web UI walkthrough (15 min)
- [ ] API documentation walkthrough (15 min)
- [ ] Bulk validation demo (15 min)
- [ ] CLI demo (10 min, optional)

## Documentation
- [ ] README + DEPLOYMENT shared
- [ ] API.md shared
- [ ] SUPPORT-PLANS signed
- [ ] This checklist signed

## 24h go/no-go
- [ ] Single email validation works
- [ ] Bulk validation (10 emails) works
- [ ] API endpoint returns valid JSON
- [ ] CSV export works
- [ ] Webhook fires (if configured)
- [ ] Uptime monitor green for 24h

---

**Client**: ____________________  Date: ____ / ____ / ______
**Developer**: Mahmoud Hamdy — Date: ____ / ____ / ______
