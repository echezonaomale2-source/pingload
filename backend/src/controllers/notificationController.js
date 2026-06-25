const Notification = require('../models/Notification');

// GET /notifications
const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      isRead: false,
    });

    res.json({ success: true, data: notifications, unreadCount });
  } catch (error) {
    next(error);
  }
};

// PATCH /notifications/:id/read
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
};

// PATCH /notifications/read-all
const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
};

// GET /notifications/unread-count
const getUnreadCount = async (req, res, next) => {
  try {
    const unreadCount = await Notification.countDocuments({
      userId: req.user._id,
      isRead: false,
    });
    res.json({ success: true, data: { unreadCount } });
  } catch (error) {
    next(error);
  }
};

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllAsRead };
