# Firebase Cloud Messaging — Pingload Mobile

## Required files (place in `mobile/`)

| File | Platform |
|------|----------|
| `google-services.json` | Android |
| `GoogleService-Info.plist` | iOS |

Verify:
```bash
cd mobile && npm run verify:firebase
```

## Native build required

Push notifications **do not work in Expo Go**. Build a dev/production native app:

```bash
cd mobile
npm run verify:firebase
npm run prebuild
npm run android:device   # Android
npm run ios:device       # iOS (macOS + Xcode)
```

## Onboarding permission

Notification permission is requested on the last onboarding slide (“Get Started”). The FCM token is cached locally and registered with the backend after login.

## Backend credentials

Set in `backend/.env`:

```
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

Verify backend:
```bash
cd backend && npm run verify:fcm
```

## iOS additional setup

1. Upload **APNs Authentication Key** (.p8) in Firebase Console → Project Settings → Cloud Messaging
2. Enable **Push Notifications** capability (added automatically via `expo-notifications` prebuild)
3. Test on a **physical iOS device** (simulator does not receive remote push)

## Android additional setup

1. Ensure `google-services.json` matches package `com.pingload.app`
2. Test on a **physical device** or emulator with Google Play Services

## Admin push notifications

Admin dashboard → **Notification Center**:
- Send to all users or a specific user
- Title + message fields
- Optional “Open screen on tap” target

Notifications are stored in MongoDB (`notifications` collection) and delivered via FCM when configured.

## Testing checklist

- [ ] `npm run verify:firebase` passes
- [ ] `npm run verify:fcm` passes (backend)
- [ ] Login on device → token saved (`devicetokens` collection in MongoDB)
- [ ] Send test notification from admin → appears with app in background/closed
- [ ] Tap notification → app opens to selected screen
- [ ] Badge count updates on tab bar and app icon
