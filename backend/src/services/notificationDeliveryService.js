const Notification = require('../models/Notification');
const { sendPushToUser, sendPushToUsers } = require('./fcmService');
const { logApiFailure } = require('../utils/logger');

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
  if (push) {
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
    try {
      pushResult = await sendPushToUsers({
        userIds,
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
