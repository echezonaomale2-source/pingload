import api from './api';

export const transactionService = {
  getTransactions: (params) => api.get('/transactions', { params }),
  getTransactionById: (id) => api.get(`/transactions/${id}`),
};

export const notificationService = {
  getNotifications: () => api.get('/notifications', { skipGlobalLoader: true }),
  getUnreadCount: () => api.get('/notifications/unread-count', { skipGlobalLoader: true }),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch('/notifications/read-all'),
};

export const referralService = {
  getReferrals: () => api.get('/referrals'),
};
