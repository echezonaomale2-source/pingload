const admin = require('firebase-admin');
const { getMessaging } = require('firebase-admin/messaging');
const DeviceToken = require('../models/DeviceToken');
const Notification = require('../models/Notification');

let firebaseApp = null;

const normalizePrivateKey = (key) => (key || '').replace(/\\n/g, '\n');

const isFcmConfigured = () => Boolean(
  process.env.FIREBASE_PROJECT_ID
  && process.env.FIREBASE_CLIENT_EMAIL
  && process.env.FIREBASE_PRIVATE_KEY
);

const getFirebaseApp = () => {
  if (firebaseApp) return firebaseApp;
  if (!isFcmConfigured()) return null;

  firebaseApp = admin.initializeApp({
    credential: admin.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
    }),
  });

  return firebaseApp;
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
  sendPushToTokens,
  sendPushToUser,
  sendPushToUsers,
  deactivateInvalidTokens,
};
