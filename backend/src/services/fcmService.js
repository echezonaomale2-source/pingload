const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { getMessaging } = require('firebase-admin/messaging');
const DeviceToken = require('../models/DeviceToken');
const Notification = require('../models/Notification');
const { logApiFailure } = require('../utils/logger');
const { getPushChannelId } = require('../utils/pushChannels');

/** Must match mobile/google-services.json project_id */
const EXPECTED_FIREBASE_PROJECT_ID = process.env.FIREBASE_EXPECTED_PROJECT_ID || 'pingload';

let firebaseApp = null;
let firebaseInitFailed = false;
let lastCredentialError = null;
let resolvedCredentialMeta = null;

const stripWrappingQuotes = (value = '') => {
  let text = String(value || '').trim();
  if (
    (text.startsWith('"') && text.endsWith('"'))
    || (text.startsWith("'") && text.endsWith("'"))
  ) {
    text = text.slice(1, -1).trim();
  }
  return text;
};

const normalizePrivateKey = (rawKey) => {
  let key = stripWrappingQuotes(rawKey);
  if (!key) return '';

  // Double-escaped newlines from some hosts (\\\\n → \n)
  key = key.replace(/\\\\n/g, '\\n');

  if (!key.includes('BEGIN PRIVATE KEY') && /^[A-Za-z0-9+/=\s]+$/.test(key) && key.length > 100) {
    try {
      const decoded = Buffer.from(key, 'base64').toString('utf8');
      if (decoded.includes('BEGIN PRIVATE KEY')) key = decoded.trim();
    } catch {
      // fall through
    }
  }

  return key
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');
};

const parseServiceAccountJson = (raw) => {
  if (!raw || typeof raw !== 'string') return null;
  let text = raw.trim();
  if (
    (text.startsWith("'") && text.endsWith("'"))
    || (text.startsWith('"') && text.endsWith('"'))
  ) {
    text = text.slice(1, -1);
  }

  // Allow base64-encoded full JSON (common on Render).
  if (!text.startsWith('{')) {
    try {
      const decoded = Buffer.from(text, 'base64').toString('utf8');
      if (decoded.trim().startsWith('{')) text = decoded.trim();
    } catch {
      return null;
    }
  }

  try {
    const parsed = JSON.parse(text);
    if (!parsed.private_key || !parsed.client_email || !parsed.project_id) return null;
    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: normalizePrivateKey(parsed.private_key),
      source: 'FIREBASE_SERVICE_ACCOUNT_JSON',
    };
  } catch {
    return null;
  }
};

const loadCredentialFromFile = (filePath) => {
  if (!filePath) return null;
  try {
    const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(process.cwd(), filePath);
    if (!fs.existsSync(absolute)) return null;
    const parsed = JSON.parse(fs.readFileSync(absolute, 'utf8'));
    if (!parsed.private_key || !parsed.client_email || !parsed.project_id) return null;
    return {
      projectId: parsed.project_id,
      clientEmail: parsed.client_email,
      privateKey: normalizePrivateKey(parsed.private_key),
      source: `file:${absolute}`,
    };
  } catch {
    return null;
  }
};

/**
 * Resolve Firebase Admin credentials from (in order):
 * 1. FIREBASE_SERVICE_ACCOUNT_JSON (raw or base64 JSON)
 * 2. GOOGLE_APPLICATION_CREDENTIALS / FIREBASE_SERVICE_ACCOUNT_PATH file
 * 3. FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY
 */
const resolveFirebaseCredentials = () => {
  const fromJson = parseServiceAccountJson(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  if (fromJson) return fromJson;

  const fromFile = loadCredentialFromFile(
    process.env.GOOGLE_APPLICATION_CREDENTIALS
    || process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  );
  if (fromFile) return fromFile;

  if (
    process.env.FIREBASE_PROJECT_ID
    && process.env.FIREBASE_CLIENT_EMAIL
    && process.env.FIREBASE_PRIVATE_KEY
  ) {
    return {
      projectId: stripWrappingQuotes(process.env.FIREBASE_PROJECT_ID),
      clientEmail: stripWrappingQuotes(process.env.FIREBASE_CLIENT_EMAIL),
      privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
      source: 'FIREBASE_* env fields',
    };
  }

  return null;
};

const isFcmConfigured = () => Boolean(resolveFirebaseCredentials());

const verifyFirebaseConfig = () => {
  const creds = resolveFirebaseCredentials();
  if (!creds) {
    return {
      ok: false,
      configured: false,
      reason: 'Missing Firebase credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY.',
      expectedProjectId: EXPECTED_FIREBASE_PROJECT_ID,
    };
  }

  if (!creds.privateKey.includes('BEGIN PRIVATE KEY') || !creds.privateKey.includes('END PRIVATE KEY')) {
    return {
      ok: false,
      configured: true,
      reason: 'Firebase private key is not a valid PEM after normalization',
      projectId: creds.projectId,
      clientEmail: creds.clientEmail,
      source: creds.source,
      expectedProjectId: EXPECTED_FIREBASE_PROJECT_ID,
    };
  }

  if (creds.projectId !== EXPECTED_FIREBASE_PROJECT_ID) {
    return {
      ok: false,
      configured: true,
      reason: `Firebase project mismatch: credentials are for "${creds.projectId}" but the Android app uses "${EXPECTED_FIREBASE_PROJECT_ID}". Update Render credentials to the pingload service account.`,
      projectId: creds.projectId,
      clientEmail: creds.clientEmail,
      source: creds.source,
      expectedProjectId: EXPECTED_FIREBASE_PROJECT_ID,
    };
  }

  return {
    ok: true,
    configured: true,
    projectId: creds.projectId,
    clientEmail: creds.clientEmail,
    source: creds.source,
    expectedProjectId: EXPECTED_FIREBASE_PROJECT_ID,
  };
};

const getFirebaseApp = () => {
  if (firebaseApp) return firebaseApp;
  if (firebaseInitFailed) return null;

  const status = verifyFirebaseConfig();
  if (!status.ok) {
    firebaseInitFailed = true;
    lastCredentialError = status.reason;
    return null;
  }

  const creds = resolveFirebaseCredentials();
  try {
    firebaseApp = admin.initializeApp({
      credential: admin.cert({
        projectId: creds.projectId,
        clientEmail: creds.clientEmail,
        privateKey: creds.privateKey,
      }),
      projectId: creds.projectId,
    });
    resolvedCredentialMeta = {
      projectId: creds.projectId,
      clientEmail: creds.clientEmail,
      source: creds.source,
    };
    lastCredentialError = null;
    return firebaseApp;
  } catch (error) {
    firebaseInitFailed = true;
    lastCredentialError = error.message;
    logApiFailure('fcm:init', error, {
      hint: 'Firebase Admin failed to initialize. Use a service account JSON from Firebase project "pingload".',
      projectId: creds?.projectId,
      source: creds?.source,
    });
    return null;
  }
};

/**
 * Actually talk to Google to prove the service account key works.
 * Format checks alone are not enough — Render can have a PEM that parses but is rejected.
 */
const verifyFirebaseLiveAuth = async () => {
  const status = verifyFirebaseConfig();
  if (!status.ok) {
    return { ...status, liveOk: false, initialized: false };
  }

  // Allow retry after fixing env without process restart needing a full redeploy wait.
  firebaseInitFailed = false;
  const app = getFirebaseApp();
  if (!app) {
    return {
      ...status,
      liveOk: false,
      initialized: false,
      reason: lastCredentialError || 'Firebase Admin failed to initialize',
    };
  }

  try {
    const token = await app.options.credential.getAccessToken();
    if (!token?.access_token) {
      return {
        ...status,
        liveOk: false,
        initialized: true,
        reason: 'Firebase credential getAccessToken() returned no access token',
      };
    }
    lastCredentialError = null;
    return {
      ...status,
      liveOk: true,
      initialized: true,
      tokenExpiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000).toISOString() : null,
    };
  } catch (error) {
    firebaseInitFailed = true;
    lastCredentialError = error.message;
    try {
      if (firebaseApp) {
        await firebaseApp.delete();
      }
    } catch {
      // ignore
    }
    firebaseApp = null;
    logApiFailure('fcm:live-auth', error, {
      hint: 'Service account key was rejected by Google. Download a NEW key from Firebase Console → Project settings → Service accounts for project "pingload", then set FIREBASE_SERVICE_ACCOUNT_JSON (or FIREBASE_PRIVATE_KEY) on Render.',
      projectId: status.projectId,
      clientEmail: status.clientEmail,
    });
    return {
      ...status,
      liveOk: false,
      initialized: false,
      reason: `Google rejected Firebase credentials: ${error.message}`,
    };
  }
};

const initializeFcm = async () => {
  const live = await verifyFirebaseLiveAuth();
  if (!live.configured) {
    return { ...live, initialized: false };
  }
  if (!live.ok || !live.liveOk) {
    logApiFailure('fcm:startup', new Error(live.reason || 'FCM credential validation failed'), {
      hint: 'Push notifications disabled until Firebase service-account credentials are fixed on Render.',
      expectedProjectId: EXPECTED_FIREBASE_PROJECT_ID,
      projectId: live.projectId,
      clientEmail: live.clientEmail,
    });
  }
  return live;
};

const stringifyData = (data = {}) => Object.fromEntries(
  Object.entries(data)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => [key, String(value)])
);

const deactivateInvalidTokens = async (tokens = []) => {
  if (!tokens.length) return 0;
  const result = await DeviceToken.updateMany(
    { token: { $in: tokens } },
    { $set: { isActive: false } }
  );
  return result.modifiedCount || result.nModified || tokens.length;
};

const isCredentialErrorCode = (code = '') => /invalid-credential|mismatched-credential|authentication|third-party-auth-error/i.test(code);

const FCM_MULTICAST_LIMIT = 500;

const sendPushToTokens = async ({ tokens, title, body, data = {}, badgeCount, channelId } = {}) => {
  const uniqueTokens = [...new Set((tokens || []).filter(Boolean))];
  if (!uniqueTokens.length) {
    return { success: true, sent: 0, failed: 0, skipped: true, reason: 'no_tokens' };
  }

  const app = getFirebaseApp();
  if (!app) {
    return {
      success: false,
      sent: 0,
      failed: uniqueTokens.length,
      skipped: true,
      reason: 'fcm_not_configured',
      message: lastCredentialError
        || 'Firebase Admin is not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON from the pingload Firebase project.',
      errorSummary: { 'fcm_not_configured': uniqueTokens.length },
    };
  }

  const safeTitle = (title && String(title).trim()) || 'Pingload';
  const safeBody = body == null ? '' : String(body);
  const badge = Number.isFinite(badgeCount) ? badgeCount : undefined;
  const stringData = stringifyData({
    ...data,
    title: safeTitle,
    body: safeBody,
  });
  const androidChannel = channelId || getPushChannelId(data.type);

  const DEACTIVATE_CODES = new Set([
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token',
  ]);

  const invalidTokens = [];
  const failedTokenSamples = [];
  const errorSummary = {};
  let successCount = 0;
  let failureCount = 0;
  let credentialFailure = false;

  try {
    for (let offset = 0; offset < uniqueTokens.length; offset += FCM_MULTICAST_LIMIT) {
      const chunk = uniqueTokens.slice(offset, offset + FCM_MULTICAST_LIMIT);
      const response = await getMessaging(app).sendEachForMulticast({
        tokens: chunk,
        notification: {
          title: safeTitle,
          body: safeBody,
        },
        data: stringData,
        android: {
          priority: 'high',
          notification: {
            title: safeTitle,
            body: safeBody,
            channelId: androidChannel,
            sound: 'default',
            notificationCount: badge,
            visibility: 'public',
            defaultVibrateTimings: true,
            defaultSound: true,
          },
        },
        apns: {
          headers: { 'apns-priority': '10' },
          payload: {
            aps: {
              alert: { title: safeTitle, body: safeBody },
              sound: 'default',
              ...(badge !== undefined ? { badge } : {}),
              'content-available': 1,
            },
          },
        },
      });

      successCount += response.successCount;
      failureCount += response.failureCount;

      response.responses.forEach((item, index) => {
        if (!item.success) {
          const code = item.error?.code || 'unknown';
          errorSummary[code] = (errorSummary[code] || 0) + 1;
          if (isCredentialErrorCode(code)) {
            credentialFailure = true;
          }
          if (DEACTIVATE_CODES.has(code)) {
            invalidTokens.push(chunk[index]);
          }
          if (failedTokenSamples.length < 10) {
            failedTokenSamples.push({
              tokenPrefix: String(chunk[index]).slice(0, 16),
              code,
              message: item.error?.message || '',
            });
          }
        }
      });
    }

    if (credentialFailure) {
      // Do NOT deactivate tokens — this is a server credential problem.
      logApiFailure('fcm:invalid-credential', new Error('Firebase Admin credentials rejected by Google'), {
        tokenCount: uniqueTokens.length,
        errorSummary,
        projectId: resolvedCredentialMeta?.projectId,
        clientEmail: resolvedCredentialMeta?.clientEmail,
        source: resolvedCredentialMeta?.source,
        expectedProjectId: EXPECTED_FIREBASE_PROJECT_ID,
        hint: 'Replace Render FIREBASE_* / FIREBASE_SERVICE_ACCOUNT_JSON with a fresh service account from Firebase project "pingload".',
      });

      return {
        success: false,
        sent: successCount,
        failed: failureCount,
        skipped: true,
        reason: 'invalid_credential',
        message: `Firebase Admin credentials are invalid for project "${resolvedCredentialMeta?.projectId || 'unknown'}". Update Render env to a service account from Firebase project "${EXPECTED_FIREBASE_PROJECT_ID}".`,
        errorSummary,
        failedTokenSamples,
        projectId: resolvedCredentialMeta?.projectId,
        expectedProjectId: EXPECTED_FIREBASE_PROJECT_ID,
      };
    }

    if (Object.keys(errorSummary).length) {
      logApiFailure('fcm:send-batch', new Error('FCM multicast partial/total failure'), {
        tokenCount: uniqueTokens.length,
        sent: successCount,
        failed: failureCount,
        errorSummary,
        failedTokenSamples,
        projectId: resolvedCredentialMeta?.projectId,
      });
    }

    const deactivated = await deactivateInvalidTokens(invalidTokens);

    return {
      success: failureCount === 0,
      sent: successCount,
      failed: failureCount,
      invalidTokens: invalidTokens.length,
      deactivated,
      errorSummary: Object.keys(errorSummary).length ? errorSummary : undefined,
      failedTokenSamples: failedTokenSamples.length ? failedTokenSamples : undefined,
      projectId: resolvedCredentialMeta?.projectId,
    };
  } catch (error) {
    const code = error.code || 'fcm_send_error';
    logApiFailure('fcm:send', error, {
      tokenCount: uniqueTokens.length,
      projectId: resolvedCredentialMeta?.projectId,
    });

    if (isCredentialErrorCode(code) || /invalid.credential/i.test(error.message || '')) {
      return {
        success: false,
        sent: 0,
        failed: uniqueTokens.length,
        skipped: true,
        reason: 'invalid_credential',
        message: `Firebase Admin rejected credentials: ${error.message}`,
        errorSummary: { [code]: uniqueTokens.length },
        projectId: resolvedCredentialMeta?.projectId,
        expectedProjectId: EXPECTED_FIREBASE_PROJECT_ID,
      };
    }

    return {
      success: false,
      sent: 0,
      failed: uniqueTokens.length,
      skipped: true,
      reason: 'fcm_send_error',
      error: error.message,
      errorSummary: { [code]: uniqueTokens.length },
    };
  }
};

const getUnreadCountForUser = async (userId) => Notification.countDocuments({
  userId,
  isRead: false,
});

const sendPushToUser = async ({ userId, title, body, data = {} }) => {
  const [devices, badgeCount] = await Promise.all([
    DeviceToken.find({ userId, isActive: true, provider: 'fcm' }).select('token'),
    getUnreadCountForUser(userId),
  ]);

  if (!devices.length) {
    return {
      success: false,
      sent: 0,
      failed: 0,
      skipped: true,
      reason: 'no_tokens',
      message: 'No active FCM device tokens for this user.',
    };
  }

  return sendPushToTokens({
    tokens: devices.map((device) => device.token),
    title,
    body,
    data: { ...data, badgeCount: String(badgeCount), type: data.type || 'system' },
    badgeCount,
    channelId: getPushChannelId(data.type),
  });
};

const sendPushToUsers = async ({ userIds, title, body, data = {} }) => {
  const ids = [...new Set((userIds || []).map(String).filter(Boolean))];
  if (!ids.length) {
    return { success: true, sent: 0, failed: 0, skipped: true, reason: 'no_tokens', reasonDetail: 'no_users' };
  }

  const devices = await DeviceToken.find({
    userId: { $in: ids },
    isActive: true,
    provider: 'fcm',
  }).select('token');

  if (!devices.length) {
    return {
      success: false,
      sent: 0,
      failed: 0,
      skipped: true,
      reason: 'no_tokens',
      message: 'No active FCM device tokens. Users must open a production build and allow notifications.',
    };
  }

  return sendPushToTokens({
    tokens: devices.map((device) => device.token),
    title,
    body,
    data: { ...data, type: data.type || 'system' },
    channelId: getPushChannelId(data.type),
  });
};

module.exports = {
  isFcmConfigured,
  verifyFirebaseConfig,
  verifyFirebaseLiveAuth,
  initializeFcm,
  normalizePrivateKey,
  resolveFirebaseCredentials,
  EXPECTED_FIREBASE_PROJECT_ID,
  sendPushToTokens,
  sendPushToUser,
  sendPushToUsers,
  deactivateInvalidTokens,
};
