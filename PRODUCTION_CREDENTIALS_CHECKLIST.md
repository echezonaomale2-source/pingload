# Pingload — Production Credentials Checklist

Use this checklist before launching Pingload to production. **Do not deploy until every required item is filled with real credentials** (not placeholders).

**Production domain:** `pingload.top`  
**Support email:** `support@pingload.top`  
**Paystack webhook:** `https://pingload.top/api/webhooks/paystack`

---

## How environment loading works

| App | Config file | Production trigger |
|-----|-------------|-------------------|
| **Backend** | `backend/.env` | `NODE_ENV=production` — startup validates live keys |
| **Mobile** | `mobile/.env` → `app.config.js` | Set `EXPO_PUBLIC_*` vars before `eas build` / release build |
| **Admin** | `admin/.env` | Set `VITE_API_URL` before `npm run build` |

**Templates:**
- Production backend: copy `backend/.env.example` → `backend/.env`
- Local dev (sandbox): copy `backend/.env.development.example` → `backend/.env`
- Mobile: copy `mobile/.env.example` → `mobile/.env`
- Admin: copy `admin/.env.example` → `admin/.env`

---

## Backend — Required before launch

| Variable | Where to get it | Used for |
|----------|-----------------|----------|
| `NODE_ENV` | Set to `production` | Enables production validation |
| `SERVICE_MODE` | Set to `production` | Forces Paystack live + VTpass live |
| `MONGODB_URI` | [MongoDB Atlas](https://www.mongodb.com/atlas) or your host | Database |
| `JWT_SECRET` | Generate: `openssl rand -base64 48` | User/admin JWT signing |
| `PAYSTACK_PUBLIC_KEY` | [Paystack Dashboard](https://dashboard.paystack.com/#/settings/developer) → **Live** keys | Wallet funding (returned via `/wallet/payment-config`) |
| `PAYSTACK_SECRET_KEY` | Paystack Dashboard → **Live** secret key | Initialize/verify payments, webhook HMAC |
| `VTPASS_API_KEY` | [VTpass Dashboard](https://vtpass.com) → Live API | VTU purchases (airtime, data, bills) |
| `VTPASS_PUBLIC_KEY` | VTpass Dashboard → Live public key | VTpass GET requests |
| `VTPASS_SECRET_KEY` | VTpass Dashboard → Live secret key | VTpass POST/purchase requests |
| `TERMII_API_KEY` | [Termii Dashboard](https://accounts.termii.com/) | OTP for registration & password reset |
| `TERMII_EMAIL_CONFIGURATION_ID` | Termii Dashboard → Email config | Email OTP channel |
| `TERMII_SENDER_ID` | Termii approved sender ID | SMS sender name |
| `API_PUBLIC_URL` | `https://pingload.top` | Logs, app-config endpoint |
| `FRONTEND_URL` | `pingload://wallet/verify` | Paystack checkout redirect |
| `CORS_ORIGIN` | Admin dashboard URL, e.g. `https://admin.pingload.top` | Browser CORS (comma-separated if multiple) |
| `ADMIN_EMAIL` | Your choice, e.g. `admin@pingload.top` | Initial super-admin account |
| `ADMIN_PASSWORD` | Strong password (min 12 chars) | Initial super-admin account — change after first login |
| `DEVELOPMENT_MODE` | Set to `false` | Disables console OTP logging |

### Backend — Paystack webhook (register in dashboard)

| Item | Value |
|------|-------|
| Webhook URL | `https://pingload.top/api/webhooks/paystack` |
| Signing secret | Uses `PAYSTACK_SECRET_KEY` (HMAC SHA512) |
| Events | `charge.success`, `charge.failed`, `transfer.success`, `transfer.failed` |

---

## Backend — Optional / recommended

| Variable | Default | Used for |
|----------|---------|----------|
| `PORT` | `5003` | HTTP port |
| `JWT_EXPIRES_IN` | `7d` | Token lifetime |
| `PAYSTACK_BASE_URL` | `https://api.paystack.co` | Paystack API override |
| `VTPASS_BASE_URL` | `https://vtpass.com/api` | VTpass API override |
| `TERMII_BASE_URL` | `https://api.ng.termii.com/api` | Termii API override |
| `TERMII_OTP_CHANNEL` | `auto` | OTP delivery channel |
| `REFERRAL_BONUS` | `100` | Referral reward amount (₦) |
| `ENABLE_SERVICE_LOGS` | `true` | Structured service logs |
| `APP_DOMAIN` | `pingload.top` | Returned via app-config |
| `PRIVACY_POLICY_URL` | `https://pingload.top/privacy` | Mobile legal link |
| `TERMS_URL` | `https://pingload.top/terms` | Mobile legal link |
| `SUPPORT_EMAIL` | `support@pingload.top` | Returned via `GET /api/services/app-config` |
| `SUPPORT_WHATSAPP` | — | WhatsApp support number (country code, no +) |

---

## Mobile — Required before App Store / Play Store build

| Variable | Where to get it | Used for |
|----------|-----------------|----------|
| `EXPO_PUBLIC_USE_LIVE_API` | Set to `true` | Switches from LAN dev API to production |
| `EXPO_PUBLIC_API_URL` | `https://pingload.top/api` | All API calls |
| `EXPO_PUBLIC_TAWK_PROPERTY_ID` | [Tawk.to Dashboard](https://dashboard.tawk.to/) | In-app live chat |
| `EXPO_PUBLIC_TAWK_WIDGET_ID` | Tawk.to widget settings | Live chat widget |
| `EXPO_PUBLIC_SUPPORT_WHATSAPP` | Your support line | Support screen WhatsApp link |
| `EXPO_PUBLIC_SUPPORT_EMAIL` | `support@pingload.top` | Support screen email link |
| `EXPO_PUBLIC_PRIVACY_POLICY_URL` | `https://pingload.top/privacy` | Register screen link |
| `EXPO_PUBLIC_TERMS_URL` | `https://pingload.top/terms` | Register screen link |
| `EXPO_PUBLIC_APP_DOMAIN` | `pingload.top` | App branding / fallbacks |

**Not needed in mobile `.env`:**
- Paystack **secret** key — server only
- Paystack **public** key — fetched at runtime from `GET /wallet/payment-config`
- VTpass keys — server only
- Termii keys — server only

---

## Admin dashboard — Required before deploy

| Variable | Where to get it | Used for |
|----------|-----------------|----------|
| `VITE_API_URL` | `https://pingload.top/api` | All admin API calls |

Build command: `npm run build` — env vars are baked in at build time.

---

## Infrastructure — Required (not in .env)

| Item | Notes |
|------|-------|
| **SSL/TLS certificate** | HTTPS required for API, admin, and Paystack webhooks |
| **Domain: API** | `pingload.top` → backend server (reverse proxy to port 5003) |
| **Domain: Admin** | `admin.pingload.top` → static admin build (optional) |
| **Legal pages** | Host Privacy Policy and Terms at configured URLs |
| **MongoDB replica set** | Recommended for atomic wallet transactions |
| **Process manager** | PM2, Docker, or cloud platform for backend uptime |
| **Apple Developer account** | iOS App Store submission |
| **Google Play Console** | Android submission |
| **EAS / Expo build profile** | Production signing certificates for mobile |

---

## Pre-launch verification steps

- [ ] `backend/.env` copied from `.env.example` with all placeholders replaced
- [ ] `NODE_ENV=production` starts backend without validation errors
- [ ] Paystack live webhook registered at `https://pingload.top/api/webhooks/paystack`
- [ ] Live test payment credited wallet once (check `WebhookLog` collection)
- [ ] VTpass live airtime/data purchase succeeds end-to-end
- [ ] Termii OTP delivered to real phone/email (not console log)
- [ ] `mobile/.env` filled; `EXPO_PUBLIC_USE_LIVE_API=true` for production build
- [ ] `admin/.env` filled; production build points to live API
- [ ] Admin password changed from seed value after first login
- [ ] CORS allows admin origin only (not `*`)
- [ ] JWT_SECRET is unique and not the dev default
- [ ] `.env` files are in `.gitignore` and not committed
- [ ] Privacy Policy and Terms published at configured URLs

---

## Startup validation (automatic when `NODE_ENV=production`)

The backend **refuses to start** if any of these are detected:

- `SERVICE_MODE` is not `production`
- Paystack test keys (`sk_test_*`)
- VTpass sandbox mode
- `DEVELOPMENT_MODE=true`
- Default `JWT_SECRET` or `ADMIN_PASSWORD=admin123`
- Placeholder values containing `<your-` or `xxx`
- Missing: `MONGODB_URI`, `JWT_SECRET`, Paystack keys, VTpass keys, Termii key, `CORS_ORIGIN`, `FRONTEND_URL`, `API_PUBLIC_URL`, `ADMIN_PASSWORD`

---

## Quick copy commands

```bash
# Production backend
cp backend/.env.example backend/.env

# Local development (sandbox)
cp backend/.env.development.example backend/.env

# Mobile
cp mobile/.env.example mobile/.env

# Admin
cp admin/.env.example admin/.env
```

Then edit each file and replace every `<placeholder>` with your live values.

See also: [PRODUCTION_READINESS_AUDIT.md](./PRODUCTION_READINESS_AUDIT.md) for full audit and deployment checklist.
