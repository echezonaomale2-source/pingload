# Pingload v1.0.0 — Release Notes

**Release date:** 2026-07-10  
**Mobile:** 1.0.11 (Android versionCode 12)  
**Git tag:** `v1.0.0`

## Summary

First enterprise production release of Pingload — Nigerian VTU wallet app with VTpass fulfillment, Paystack funding, FCM push, and admin operations.

## Highlights

- **VTU:** Airtime, data, electricity, cable TV, education PINs, betting wallet funding via VTpass
- **Wallet:** Paystack funding with HMAC webhook verification, transfers, atomic debit/credit
- **Push:** FCM-only device tokens, admin broadcast, preference-aware delivery
- **Admin:** Catalog sync (data, TV, electricity, education, betting), pricing, KYC, users, wallets
- **Security:** JWT + tokenVersion, rate limits, mongo sanitize, Helmet, transaction PIN, app unlock gate
- **Play Store:** targetSdk 35, RECORD_AUDIO blocked, privacy/terms URLs, account deletion

## What’s included

### Backend
- Auth (OTP, register, login, password reset, account deletion)
- Wallet fund / transfer / history
- VTU purchases with idempotency keys and auto-refund on provider failure
- Paystack webhook with retry-safe processing
- Admin APIs for catalog, notifications, KYC, revenue, support
- Health: `GET /health`, `GET /api/health`

### Mobile
- Full auth + login PIN / biometric unlock
- Service screens with sticky Buy Data footer and smart plan categories
- No provider brand labels in the user UI
- Push registration for production FCM builds

### Admin
- Dashboard, users, wallets, transactions, refunds
- Data / TV / electricity / education / betting catalog management + sync
- Notifications with delivery feedback
- Settings, FAQ, support, security events

## Not in v1.0.0 (by design)

- Gift cards / airtime-to-cash (shown as coming soon)
- Bank transfer funding / withdrawals
- JWT refresh-token pair (single JWT + logout revocation)
- Multi-admin RBAC UI (all admins share full access)

## Upgrade notes

1. Deploy backend to Render (ensure `FIREBASE_*`, Paystack live keys, VTpass, MongoDB replica set).
2. Run admin sync: Data Plans, TV Plans, Electricity Providers, Education Exams.
3. Build fresh AAB/APK from this tag (do not ship older 1.0.9 APKs that included RECORD_AUDIO).
4. Users must open the production app once after install to register FCM tokens for push.

## Build commands

```bash
cd mobile
npx eas-cli build -p android --profile production      # AAB for Play Store
npx eas-cli build -p android --profile production-apk  # APK for sideload/testing
```
