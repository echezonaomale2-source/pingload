# Pingload — Final Deployment Checklist

**Render API (live):** `https://pingload-api.onrender.com`  
**Domain (after DNS):** `pingload.top`  
**Admin:** `https://admin.pingload.top`  
**API:** `https://pingload.top/api`  
**Health check path:** `/health` (NOT `/` — the root path intentionally returns a 404 "Route not found")  
**Paystack webhook:** `https://pingload.top/api/webhooks/paystack`

---

## Phase 1 — Backend (Render)

- [ ] Create MongoDB Atlas cluster and copy connection string
- [ ] Create Render Web Service from root `render.yaml` (Blueprint)
- [ ] Set all `sync: false` secrets in Render Dashboard (see table below)
- [ ] Verify `GET https://pingload-api.onrender.com/health` returns 200 (use `/health`, not `/`)
- [ ] Verify `GET https://pingload-api.onrender.com/api/services/app-config` returns config with `serviceMode: production` (confirms env vars + MongoDB are live)
- [ ] Point custom domain `pingload.top` to Render service
- [ ] Confirm SSL certificate is active (HTTPS)
- [ ] Re-verify `GET https://pingload.top/health` returns 200 once domain is live
- [ ] Register Paystack webhook: `https://pingload.top/api/webhooks/paystack`
- [ ] Run `npm run verify:paystack-webhook:live` against production URL
- [ ] Test live wallet funding (small amount)
- [ ] Test live VTpass purchase (minimum airtime)
- [ ] Confirm Termii OTP delivers to real phone/email
- [ ] Change admin password after first login

### Render secrets to set (`sync: false`)

| Variable | Required for |
|----------|--------------|
| `MONGODB_URI` | Database (Atlas) |
| `JWT_SECRET` | JWT signing |
| `PAYSTACK_PUBLIC_KEY` | Wallet funding |
| `PAYSTACK_SECRET_KEY` | Payments + webhooks |
| `VTPASS_API_KEY` | VTU purchases |
| `VTPASS_PUBLIC_KEY` | VTpass GET |
| `VTPASS_SECRET_KEY` | VTpass POST |
| `TERMII_API_KEY` | OTP |
| `TERMII_EMAIL_CONFIGURATION_ID` | Email OTP |
| `ADMIN_PASSWORD` | Admin bootstrap |
| `FIREBASE_PROJECT_ID` | Push notifications |
| `FIREBASE_CLIENT_EMAIL` | Push notifications |
| `FIREBASE_PRIVATE_KEY` | Push notifications |
| `SUPPORT_WHATSAPP` | Support links |

---

## Phase 2 — Firebase push notifications

- [ ] Copy `google-services.json` → `mobile/google-services.json`
- [ ] Copy `GoogleService-Info.plist` → `mobile/GoogleService-Info.plist`
- [ ] Run `cd mobile && npm run verify:firebase`
- [ ] Set Firebase service account vars on Render
- [ ] Run `cd backend && npm run verify:fcm`
- [ ] Upload APNs key to Firebase (iOS)
- [ ] `npm run prebuild` in `mobile/`
- [ ] Build and install on physical Android device
- [ ] Login → confirm device token in MongoDB `devicetokens` collection
- [ ] Send test push from Admin → Notification Center
- [ ] Verify push with app in background and fully closed
- [ ] Repeat on physical iOS device

---

## Phase 3 — Admin dashboard

- [ ] `admin/.env` has `VITE_API_URL=https://pingload.top/api`
- [ ] `npm run build` in `admin/`
- [ ] Deploy `admin/dist/` to `admin.pingload.top`
- [ ] Test admin login, users, transactions, notifications, dashboard

---

## Phase 4 — Mobile app (production build)

- [ ] `mobile/.env` production values set (see below)
- [ ] Create `eas.json` with production profiles
- [ ] Android signing keystore + iOS certificates
- [ ] `eas build` or `npm run android:device` / `ios:device`
- [ ] Full regression on physical Android and iOS
- [ ] Test Tawk.to live chat on both platforms

---

## Phase 5 — Legal & store submission

- [ ] Privacy Policy at `https://pingload.top/privacy`
- [ ] Terms at `https://pingload.top/terms`
- [ ] Google Play Console listing + .aab upload
- [ ] Apple App Store Connect listing + IPA upload
- [ ] App privacy / data safety forms completed

---

## Verification commands

```bash
cd backend && node -e "require('./src/config/env'); console.log('OK')"
cd backend && npm run verify:paystack-webhook:live
cd backend && npm run verify:fcm
cd mobile && npm run verify:firebase
cd mobile && npm run verify:tawk

# Health check — expect HTTP 200 and {"success":true,...}
curl https://pingload-api.onrender.com/health

# App config — confirms env vars + MongoDB loaded (expect "serviceMode":"production")
curl https://pingload-api.onrender.com/api/services/app-config

# After custom domain DNS is live:
curl https://pingload.top/health

# NOTE: the root path returns 404 by design — this is expected, not an error:
#   curl https://pingload-api.onrender.com/  ->  {"success":false,"message":"Route not found"}
```
