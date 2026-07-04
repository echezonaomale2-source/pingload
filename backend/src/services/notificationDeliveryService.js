const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendPushToUser, sendPushToUsers } = require('./fcmService');
const { logApiFailure } = require('../utils/logger');

const shouldSendPush = (user, type) => {
  const settings = user?.notificationSettings || {};
  if (type === 'security') return settings.security !== false;
  if (type === 'promotion' || type === 'promotions') return settings.promotions !== false;
  return settings.transactions !== false;
};

const stringifyMetadata = (payload) => Object.fromEntries(
  Object.entries(payload).filter(([, value]) => value !== undefined && value !== null)
);

const buildPushData = ({ type, screen, metadata = {}, notificationId }) => stringifyMetadata({
  type: type || 'system',
  screen: screen || 'Notifications',
  notificationId: notificationId ? String(notificationId) : '',
  transactionId: metadata.transactionId ? String(metadata.transactionId) : '',
  reference: metadata.reference || metadata.originalTransactionReference || '',
});

const deliverUserNotification = async ({
  userId,
  title,
  message,
  type = 'system',
  metadata = {},
  screen,
  push = true,
}) => {
  const notification = await Notification.create({
    userId,
    title,
    message,
    type,
    metadata,
  });

  let pushResult = null;
  const user = await User.findById(userId).select('notificationSettings');
  const allowPush = push && shouldSendPush(user, type);
  if (allowPush) {
    // Best-effort: a push failure must never break the caller (e.g. a refund).
    try {
      pushResult = await sendPushToUser({
        userId,
        title,
        body: message,
        data: buildPushData({
          type,
          screen,
          metadata,
          notificationId: notification._id,
        }),
      });
    } catch (error) {
      logApiFailure('notification:push', error, { userId: String(userId), type });
      pushResult = { success: false, skipped: true, reason: 'push_error' };
    }
  } else if (push) {
    pushResult = { success: false, skipped: true, reason: 'preferences_disabled' };
  }

  return { notification, pushResult };
};

const deliverBulkNotification = async ({
  userIds,
  title,
  message,
  type = 'system',
  metadata = {},
  screen = 'Notifications',
  push = true,
}) => {
  const notifications = await Notification.insertMany(
    userIds.map((userId) => ({
      userId,
      title,
      message,
      type,
      metadata,
    }))
  );

  let pushResult = null;
  if (push) {
    const users = await User.find({ _id: { $in: userIds } }).select('notificationSettings');
    const eligibleIds = users.filter((u) => shouldSendPush(u, type)).map((u) => u._id);
    if (eligibleIds.length === 0) {
      return { notifications, pushResult: { success: false, skipped: true, reason: 'preferences_disabled' } };
    }
    try {
      pushResult = await sendPushToUsers({
        userIds: eligibleIds,
        title,
        body: message,
        data: buildPushData({ type, screen, metadata }),
      });
    } catch (error) {
      logApiFailure('notification:push-bulk', error, { userCount: userIds.length, type });
      pushResult = { success: false, skipped: true, reason: 'push_error' };
    }
  }

  return { notifications, pushResult };
};

module.exports = {
  deliverUserNotification,
  deliverBulkNotification,
  buildPushData,
};
