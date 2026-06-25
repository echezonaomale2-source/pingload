# Firebase config files for Pingload mobile

Copy your Firebase project files into the **`mobile/`** root (same folder as `app.config.js`):

| File | Source |
|------|--------|
| `google-services.json` | Firebase Console → Project Settings → Your apps → Android (`com.pingload.app`) |
| `GoogleService-Info.plist` | Firebase Console → Project Settings → Your apps → iOS (`com.pingload.app`) |

Verify after copying:

```bash
cd mobile && npm run verify:firebase
```

Then rebuild native apps (required for FCM — not Expo Go):

```bash
npm run prebuild
npm run android:device
```

## Backend FCM credentials

Set in Render Dashboard (or `backend/.env`):

- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (service account private key, `\n` for newlines)

Verify backend:

```bash
cd backend && npm run verify:fcm
```

## iOS push

Upload your **APNs Authentication Key** (.p8) in Firebase Console → Project Settings → Cloud Messaging.
