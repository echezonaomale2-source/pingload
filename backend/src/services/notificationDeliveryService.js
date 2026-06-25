const Notification = require('../models/Notification');
const { sendPushToUser, sendPushToUsers } = require('./fcmService');

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
    pushResult = await sendPushToUsers({
      userIds,
      title,
      body: message,
      data: buildPushData({ type, screen, metadata }),
    });
  }

  return { notifications, pushResult };
};

module.exports = {
  deliverUserNotification,
  deliverBulkNotification,
  buildPushData,
};
