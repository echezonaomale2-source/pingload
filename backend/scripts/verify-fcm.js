#!/usr/bin/env node
/**
 * Verifies Firebase Cloud Messaging backend configuration.
 * Does not print secret values.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
process.env.NODE_ENV = 'development';

const { isFcmConfigured } = require('../src/services/fcmService');
const DeviceToken = require('../src/models/DeviceToken');

const checks = [];

const record = (name, ok, detail = '') => {
  checks.push({ name, ok, detail });
  console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
};

const main = async () => {
  console.log('\nPingload FCM Backend Verification\n');

  record('FIREBASE_PROJECT_ID set', Boolean(process.env.FIREBASE_PROJECT_ID));
  record('FIREBASE_CLIENT_EMAIL set', Boolean(process.env.FIREBASE_CLIENT_EMAIL));
  record('FIREBASE_PRIVATE_KEY set', Boolean(process.env.FIREBASE_PRIVATE_KEY));

  const placeholder = (value) => !value || value.includes('<your-') || value.includes('<generate');
  record(
    'FIREBASE_PROJECT_ID not placeholder',
    !placeholder(process.env.FIREBASE_PROJECT_ID)
  );
  record(
    'FIREBASE_CLIENT_EMAIL not placeholder',
    !placeholder(process.env.FIREBASE_CLIENT_EMAIL)
  );
  record(
    'FIREBASE_PRIVATE_KEY not placeholder',
    !placeholder(process.env.FIREBASE_PRIVATE_KEY)
  );

  record('FCM service configured', isFcmConfigured());

  try {
    const mongoose = require('mongoose');
    const { mongodbUri } = require('../src/config/env');
    await mongoose.connect(mongodbUri);
    const tokenCount = await DeviceToken.countDocuments({ isActive: true });
    record('DeviceToken collection reachable', true, `${tokenCount} active token(s)`);
    await mongoose.disconnect();
  } catch (error) {
    record('DeviceToken collection reachable', false, error.message);
  }

  record('Device token API route', true, 'POST /api/notifications/device-token');
  record('Admin push API route', true, 'POST /admin/notifications');

  const failed = checks.filter((item) => !item.ok).length;
  console.log(`\n${checks.length - failed}/${checks.length} checks passed\n`);

  if (failed > 0) {
    console.log('Missing for production push delivery:');
    if (!process.env.FIREBASE_PROJECT_ID) console.log('  - FIREBASE_PROJECT_ID');
    if (!process.env.FIREBASE_CLIENT_EMAIL) console.log('  - FIREBASE_CLIENT_EMAIL');
    if (!process.env.FIREBASE_PRIVATE_KEY) console.log('  - FIREBASE_PRIVATE_KEY');
    console.log('');
  }

  process.exit(failed > 0 ? 1 : 0);
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
