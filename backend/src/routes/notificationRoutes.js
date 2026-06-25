const express = require('express');
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} = require('../controllers/notificationController');
const { registerDeviceToken, removeDeviceToken } = require('../controllers/deviceTokenController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllAsRead);
router.post('/device-token', registerDeviceToken);
router.delete('/device-token', removeDeviceToken);
router.patch('/:id/read', markAsRead);

module.exports = router;
