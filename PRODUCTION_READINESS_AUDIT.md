# Pingload — Production Readiness Audit

**Domain:** `pingload.top`  
**Support:** `support@pingload.top`  
**Audit date:** 2026-06-18  
**Webhook URL:** `https://pingload.top/api/webhooks/paystack`

---

## Summary

| Area | Status | Notes |
|------|--------|-------|
| Domain & email config | ✅ Ready | Code defaults updated to `pingload.top` |
| Paystack live mode | ⚠️ Action required | Set live keys in production `.env`; startup validates `sk_live_*` |
| Paystack webhook | ✅ Ready | Signature verification, idempotency, MongoDB logs |
| VTpass live mode | ⚠️ Action required | Set live keys; `VTPASS_ENV=live` enforced in production |
| App legal URLs | ✅ Ready | Privacy/Terms placeholders at `https://pingload.top/privacy` and `/terms` |
| Mobile production API | ⚠️ Action required | Set `EXPO_PUBLIC_USE_LIVE_API=true` before release build |
| SSL / hosting | ❌ Not in repo | Deploy backend behind HTTPS on `pingload.top` |
| Legal pages (web) | ❌ Not in repo | Host Privacy Policy and Terms at configured URLs |

**Overall readiness:** Configuration is in place; deployment credentials, SSL, and legal page hosting remain before go-live.

---

## Completed in this release

### 1. Production domain & support email
- API public URL: `https://pingload.top`
- Support email: `support@pingload.top`
- Referral links: `https://pingload.top/register?ref=...`
- Admin default email: `admin@pingload.top`

### 2. Paystack live mode
- `PAYSTACK_ENV=live` with `SERVICE_MODE=production`
- All Paystack API calls use `https://api.paystack.co` (live)
- Production startup **rejects** `sk_test_*` keys
- `.env.example` sanitized — no real keys in source

### 3. Paystack webhook (`POST /api/webhooks/paystack`)
- HMAC SHA512 signature via `PAYSTACK_SECRET_KEY`
- Events handled:
  - `charge.success` — atomic wallet credit (pending → successful)
  - `charge.failed` — marks funding transaction failed
  - `transfer.success` — updates pending transfer transactions
  - `transfer.failed` — marks transfer failed
- **Duplicate prevention:** unique `eventKey` in `WebhookLog` collection; duplicate webhooks return 200 without re-crediting
- **Wallet credit idempotency:** `findOneAndUpdate` on `status: 'pending'` ensures only one credit
- Webhook route excluded from API rate limiter
- Raw body preserved for signature verification

### 4. VTpass live mode
- `VTPASS_ENV=live` → `https://vtpass.com/api`
- Production startup rejects sandbox mode
- All VTU services (airtime, data, TV, electricity, education, betting) use shared `vtpassService` with HTTP logging when `ENABLE_SERVICE_LOGS=true`

### 5. App settings API (`GET /api/services/app-config`)
Returns: `apiPublicUrl`, `appDomain`, `privacyPolicyUrl`, `termsUrl`, `supportEmail`, `supportWhatsapp`, `paystackPublicKey`, `paystackMode`, `webhookUrl`

### 6. Mobile
- Register screen links to Terms & Privacy URLs
- Production API fallback: `https://pingload.top/api`

---

## Remaining issues

| # | Issue | Priority | Action |
|---|-------|----------|--------|
| 1 | Production `.env` has placeholder Paystack/VTpass keys | **Critical** | Fill live credentials on server only |
| 2 | Privacy Policy & Terms pages not hosted | **High** | Publish HTML at `/privacy` and `/terms` on `pingload.top` |
| 3 | `NODE_ENV=development` in local `.env` with `SERVICE_MODE=production` | Medium | Use `.env.development.example` locally; set `NODE_ENV=production` on server |
| 4 | MongoDB is local in dev `.env` | **Critical** | Use MongoDB Atlas replica set in production |
| 5 | JWT_SECRET is dev default in local `.env` | **Critical** | Generate unique secret for production |
| 6 | Admin dashboard not deployed | High | Build with `VITE_API_URL=https://pingload.top/api` |
| 7 | Mobile not pointed at live API | High | `EXPO_PUBLIC_USE_LIVE_API=true` + production build |
| 8 | Paystack webhook not registered in dashboard | **Critical** | Add `https://pingload.top/api/webhooks/paystack` in Paystack → Settings → Webhooks |
| 9 | Termii credentials are placeholders | High | Required for OTP in production |
| 10 | `SUPPORT_WHATSAPP` is placeholder | Medium | Set real WhatsApp business number |
| 11 | Custom app icon requires native build | Low | Expo Go won't show custom icon; use `npm run android:device` or EAS |
| 12 | Keys were previously in `.env.example` | **Critical** | Rotate Paystack & VTpass keys if those values were ever committed or shared |

---

## Security concerns

| Concern | Mitigation |
|---------|------------|
| Secret keys in environment | Never commit `.env`; `.env.example` uses placeholders only |
| Webhook forgery | HMAC signature required; invalid signature returns 401 |
| Double wallet credit | Atomic DB update + webhook `eventKey` uniqueness |
| Rate limiting on webhooks | Webhook path bypasses API rate limiter |
| CORS | Restrict `CORS_ORIGIN` to admin origin only in production |
| JWT | Strong `JWT_SECRET`; change default admin password after first login |
| Paystack public key in app-config | Public key only — secret stays server-side |
| Raw webhook payloads | Only summary fields stored in `WebhookLog`, not full body |
| HTTPS | Required for Paystack webhooks and mobile production API |

---

## Missing environment variables (production server)

Set all of these in `backend/.env` on the production host:

### Required (backend refuses to start without these)

```
NODE_ENV=production
SERVICE_MODE=production
MONGODB_URI
JWT_SECRET
PAYSTACK_ENV=live
PAYSTACK_PUBLIC_KEY
PAYSTACK_SECRET_KEY
VTPASS_ENV=live
VTPASS_API_KEY
VTPASS_PUBLIC_KEY
VTPASS_SECRET_KEY
TERMII_API_KEY
API_PUBLIC_URL=https://pingload.top
FRONTEND_URL=pingload://wallet/verify
CORS_ORIGIN=https://admin.pingload.top
ADMIN_PASSWORD
DEVELOPMENT_MODE=false
```

### Recommended

```
PORT=5003
JWT_EXPIRES_IN=7d
TERMII_SENDER_ID=Pingload
TERMII_BASE_URL=https://api.ng.termii.com/api
TERMII_EMAIL_CONFIGURATION_ID
TERMII_OTP_CHANNEL=auto
REFERRAL_BONUS=100
ENABLE_SERVICE_LOGS=true
ADMIN_EMAIL=admin@pingload.top
APP_DOMAIN=pingload.top
PRIVACY_POLICY_URL=https://pingload.top/privacy
TERMS_URL=https://pingload.top/terms
SUPPORT_EMAIL=support@pingload.top
SUPPORT_WHATSAPP
```

### Mobile (set before `eas build` / release)

```
EXPO_PUBLIC_USE_LIVE_API=true
EXPO_PUBLIC_API_URL=https://pingload.top/api
EXPO_PUBLIC_TAWK_PROPERTY_ID=6a38286a0f2eba1d56794e32
EXPO_PUBLIC_TAWK_WIDGET_ID=1jrllrok0
EXPO_PUBLIC_SUPPORT_EMAIL=support@pingload.top
EXPO_PUBLIC_SUPPORT_WHATSAPP
EXPO_PUBLIC_PRIVACY_POLICY_URL=https://pingload.top/privacy
EXPO_PUBLIC_TERMS_URL=https://pingload.top/terms
EXPO_PUBLIC_APP_DOMAIN=pingload.top
```

### Admin (set before `npm run build`)

```
VITE_API_URL=https://pingload.top/api
```

---

## Deployment checklist

### Infrastructure
- [ ] DNS: `pingload.top` → production server (A/AAAA record)
- [ ] DNS: `admin.pingload.top` → admin static host (optional subdomain)
- [ ] SSL/TLS certificate installed (Let's Encrypt or cloud provider)
- [ ] Reverse proxy (Nginx/Caddy) forwards `/api` to backend port 5003
- [ ] MongoDB Atlas cluster with replica set enabled
- [ ] Process manager (PM2/Docker) for backend uptime
- [ ] Firewall: only 80/443 public; MongoDB not exposed

### Backend
- [ ] Copy `backend/.env.example` → `backend/.env` on server
- [ ] Fill all required variables with live credentials
- [ ] `NODE_ENV=production` — verify server starts without validation errors
- [ ] Register Paystack webhook: `https://pingload.top/api/webhooks/paystack`
- [ ] Test live wallet funding (small amount) end-to-end
- [ ] Verify webhook appears in `webhooklogs` MongoDB collection
- [ ] Test VTpass live purchase (airtime minimum)
- [ ] Confirm Termii OTP delivers to real phone/email
- [ ] Change admin password after first login

### Mobile
- [ ] Set `EXPO_PUBLIC_USE_LIVE_API=true` in `mobile/.env`
- [ ] Production build via EAS or `npm run android:device` / iOS equivalent
- [ ] Verify app connects to `https://pingload.top/api`
- [ ] Test wallet funding, VTU purchase, live chat, support email link

### Admin
- [ ] Set `VITE_API_URL=https://pingload.top/api`
- [ ] `npm run build` and deploy `dist/` to `admin.pingload.top`
- [ ] Confirm CORS allows admin origin

### Legal & compliance
- [ ] Publish Privacy Policy at `https://pingload.top/privacy`
- [ ] Publish Terms at `https://pingload.top/terms`
- [ ] App Store / Play Store listing URLs match

### Post-launch monitoring
- [ ] Monitor `WebhookLog` for failed events
- [ ] Monitor wallet transaction logs
- [ ] Set up uptime check on `GET /health`
- [ ] Rotate keys if any were ever exposed in git history

---

## Paystack dashboard configuration

| Setting | Value |
|---------|-------|
| Webhook URL | `https://pingload.top/api/webhooks/paystack` |
| Signing | Automatic via `PAYSTACK_SECRET_KEY` |
| Callback URL (per transaction) | Built from `FRONTEND_URL` + reference |

---

## Quick verification commands

```bash
# Health check
curl https://pingload.top/health

# App config (no auth)
curl https://pingload.top/api/services/app-config

# Backend production validation (on server)
cd backend && NODE_ENV=production node -e "require('./src/config/env'); console.log('OK')"
```
