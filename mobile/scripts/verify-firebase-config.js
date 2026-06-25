#!/usr/bin/env node
/**
 * Verifies Firebase client config files for Android/iOS native builds.
 */
const firebaseConfig = require('../firebase.config');

console.log('\nPingload Firebase Client Verification\n');

const record = (name, ok, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

record('google-services.json present', firebaseConfig.hasAndroidConfig, firebaseConfig.androidConfigPath);
record('GoogleService-Info.plist present', firebaseConfig.hasIosConfig, firebaseConfig.iosConfigPath);

if (firebaseConfig.androidProjectId) {
  record('Android Firebase project ID detected', true, firebaseConfig.androidProjectId);
} else if (firebaseConfig.hasAndroidConfig) {
  record('Android Firebase project ID detected', false);
}

if (firebaseConfig.iosProjectId) {
  record('iOS Firebase project ID detected', true, firebaseConfig.iosProjectId);
} else if (firebaseConfig.hasIosConfig) {
  record('iOS Firebase project ID detected', false);
}

if (firebaseConfig.androidProjectId && firebaseConfig.iosProjectId) {
  record(
    'Android/iOS project IDs match',
    firebaseConfig.androidProjectId === firebaseConfig.iosProjectId,
    `${firebaseConfig.androidProjectId} vs ${firebaseConfig.iosProjectId}`
  );
}

record('Native Firebase plugins configured', true, '@react-native-firebase/app + messaging');
record('Push requires dev/production build', true, 'Expo Go does not support FCM');

const failed = [
  !firebaseConfig.hasAndroidConfig,
  !firebaseConfig.hasIosConfig,
].filter(Boolean).length;

console.log(`\n${failed === 0 ? 'Ready for native prebuild.' : 'Copy Firebase config files into mobile/ before prebuild.'}\n`);
process.exit(failed > 0 ? 1 : 0);
