const admin = require('firebase-admin');
const { getMessaging } = require('firebase-admin/messaging');
const DeviceToken = require('../models/DeviceToken');
const Notification = require('../models/Notification');
const { logApiFailure } = require('../utils/logger');

let firebaseApp = null;
// Cache the init failure so we don't spam logs / retry a doomed cert on every push.
let firebaseInitFailed = false;

/**
 * Environment variables (especially on hosts like Render) frequently mangle the
 * Firebase private key. This normalizer makes initialization resilient to the
 * three most common forms a key arrives in:
 *   1. Surrounding single/double quotes copied from a .env file.
 *   2. Escaped "\n" sequences instead of real newlines.
 *   3. The whole PEM base64-encoded (an increasingly common workaround).
 */
const normalizePrivateKey = (rawKey) => {
  let key = (rawKey || '').trim();
  if (!key) return '';

  // Strip a single layer of surrounding quotes if present.
  if (
    (key.startsWith('"') && key.endsWith('"'))
    || (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1).trim();
  }

  // If it doesn't look like a PEM but looks like base64, try to decode it.
  if (!key.includes('BEGIN PRIVATE KEY') && /^[A-Za-z0-9+/=\s]+$/.test(key) && key.length > 100) {
    try {
      const decoded = Buffer.from(key, 'base64').toString('utf8');
      if (decoded.includes('BEGIN PRIVATE KEY')) key = decoded.trim();
    } catch {
      // Not base64 — fall through and let validation report the real problem.
    }
  }

  // Convert any escaped newlines to real newlines and normalize CRLF.
  key = key
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n');

  return key;
};

const isFcmConfigured = () => Boolean(
  process.env.FIREBASE_PROJECT_ID
  && process.env.FIREBASE_CLIENT_EMAIL
  && process.env.FIREBASE_PRIVATE_KEY
);

/**
 * Validates Firebase Admin credentials without throwing.
 * Returns a structured status object suitable for startup logging.
 */
const verifyFirebaseConfig = () => {
  const missing = [];
  if (!process.env.FIREBASE_PROJECT_ID) missing.push('FIREBASE_PROJECT_ID');
  if (!process.env.FIREBASE_CLIENT_EMAIL) missing.push('FIREBASE_CLIENT_EMAIL');
  if (!process.env.FIREBASE_PRIVATE_KEY) missing.push('FIREBASE_PRIVATE_KEY');

  if (missing.length) {
    return { ok: false, configured: false, reason: `Missing: ${missing.join(', ')}` };
  }

  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
  if (!privateKey.includes('BEGIN PRIVATE KEY') || !privateKey.includes('END PRIVATE KEY')) {
    return {
      ok: false,
      configured: true,
      reason: 'FIREBASE_PRIVATE_KEY is not a valid PEM (missing BEGIN/END markers after normalization)',
    };
  }

  return {
    ok: true,
    configured: true,
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  };
};

/**
 * Lazily initializes Firebase Admin. Never throws — on failure it logs once and
 * returns null so push notifications degrade gracefully instead of breaking the
 * caller (e.g. a VTU purchase or refund must never fail because of FCM).
 */
const getFirebaseApp = () => {
  if (firebaseApp) return firebaseApp;
  if (firebaseInitFailed) return null;
  if (!isFcmConfigured()) return null;

  try {
    firebaseApp = admin.initializeApp({
      credential: admin.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
      }),
    });
    return firebaseApp;
  } catch (error) {
    firebaseInitFailed = true;
    logApiFailure('fcm:init', error, {
      hint: 'Firebase Admin failed to initialize. Push notifications are disabled. '
        + 'Verify FIREBASE_PRIVATE_KEY (escaped \\n, surrounding quotes, or base64) on the host.',
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    return null;
  }
};

/**
 * Startup hook: attempts initialization eagerly so credential problems surface
 * immediately in the logs rather than on the first push. Returns a status object
 * and never throws (push is non-critical relative to the rest of the API).
 */
const initializeFcm = () => {
  const status = verifyFirebaseConfig();
  if (!status.configured) {
    return { ...status, initialized: false };
  }
  if (!status.ok) {
    logApiFailure('fcm:startup', new Error(status.reason), {
      hint: 'Push notifications disabled. Fix FIREBASE_PRIVATE_KEY format on the host.',
    });
    return { ...status, initialized: false };
  }
  const app = getFirebaseApp();
  return { ...status, initialized: Boolean(app) };
};

const stringifyData = (data = {}) => Object.fromEntries(
  Object.entries(data)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => [key, String(value)])
);

const deactivateInvalidTokens = async (tokens = []) => {
  if (!tokens.length) return;
  await DeviceToken.updateMany({ token: { $in: tokens } }, { $set: { isActive: false } });
};

const sendPushToTokens = async ({ tokens, title, body, data = {}, badgeCount } = {}) => {
  const uniqueTokens = [...new Set((tokens || []).filter(Boolean))];
  if (!uniqueTokens.length) {
    return { success: true, sent: 0, failed: 0, skipped: true, reason: 'no_tokens' };
  }

  const app = getFirebaseApp();
  if (!app) {
    return { success: false, sent: 0, failed: uniqueTokens.length, skipped: true, reason: 'fcm_not_configured' };
  }

  const badge = Number.isFinite(badgeCount) ? badgeCount : undefined;
  const stringData = stringifyData(data);

  // Push delivery must never throw into the caller (a VTU purchase, refund, or
  // wallet funding must not fail because FCM is misconfigured or unreachable).
  try {
    const response = await getMessaging(app).sendEachForMulticast({
      tokens: uniqueTokens,
      notification: { title, body },
      data: stringData,
      android: {
        priority: 'high',
        notification: {
          channelId: 'default',
          sound: 'default',
          notificationCount: badge,
        },
      },
      apns: {
        headers: { 'apns-priority': '10' },
        payload: {
          aps: {
            alert: { title, body },
            sound: 'default',
            ...(badge !== undefined ? { badge } : {}),
            'content-available': 1,
          },
        },
      },
    });

    const invalidTokens = [];
    response.responses.forEach((item, index) => {
      if (!item.success) {
        const code = item.error?.code;
        if (code === 'messaging/registration-token-not-registered'
          || code === 'messaging/invalid-registration-token') {
          invalidTokens.push(uniqueTokens[index]);
        }
      }
    });

    await deactivateInvalidTokens(invalidTokens);

    return {
      success: response.failureCount === 0,
      sent: response.successCount,
      failed: response.failureCount,
      invalidTokens: invalidTokens.length,
    };
  } catch (error) {
    logApiFailure('fcm:send', error, { tokenCount: uniqueTokens.length });
    return { success: false, sent: 0, failed: uniqueTokens.length, skipped: true, reason: 'fcm_send_error' };
  }
};

const getUnreadCountForUser = async (userId) => Notification.countDocuments({
  userId,
  isRead: false,
});

const sendPushToUser = async ({ userId, title, body, data = {} }) => {
  const [devices, badgeCount] = await Promise.all([
    DeviceToken.find({ userId, isActive: true }).select('token'),
    getUnreadCountForUser(userId),
  ]);

  return sendPushToTokens({
    tokens: devices.map((device) => device.token),
    title,
    body,
    data: { ...data, badgeCount: String(badgeCount) },
    badgeCount,
  });
};

const sendPushToUsers = async ({ userIds, title, body, data = {} }) => {
  const ids = [...new Set((userIds || []).map(String).filter(Boolean))];
  if (!ids.length) {
    return { success: true, sent: 0, failed: 0, skipped: true, reason: 'no_users' };
  }

  const devices = await DeviceToken.find({ userId: { $in: ids }, isActive: true }).select('token userId');
  if (!devices.length) {
    return { success: true, sent: 0, failed: 0, skipped: true, reason: 'no_tokens' };
  }

  const tokensByBadge = new Map();
  await Promise.all(devices.map(async (device) => {
    const badgeCount = await getUnreadCountForUser(device.userId);
    const key = String(badgeCount);
    if (!tokensByBadge.has(key)) tokensByBadge.set(key, { badgeCount, tokens: [] });
    tokensByBadge.get(key).tokens.push(device.token);
  }));

  const results = await Promise.all(
    [...tokensByBadge.values()].map(({ badgeCount, tokens }) => sendPushToTokens({
      tokens,
      title,
      body,
      data: { ...data, badgeCount: String(badgeCount) },
      badgeCount,
    }))
  );

  return {
    success: results.every((item) => item.success),
    sent: results.reduce((sum, item) => sum + (item.sent || 0), 0),
    failed: results.reduce((sum, item) => sum + (item.failed || 0), 0),
    batches: results.length,
  };
};

module.exports = {
  isFcmConfigured,
  verifyFirebaseConfig,
  initializeFcm,
  normalizePrivateKey,
  sendPushToTokens,
  sendPushToUser,
  sendPushToUsers,
  deactivateInvalidTokens,
};
