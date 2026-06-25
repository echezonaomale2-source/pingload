import api from './api';

export const adminAuth = {
  login: (email, password) => api.post('/admin/auth/login', { email, password }),
  me: () => api.get('/admin/auth/me'),
};

export const dashboardApi = {
  getStats: () => api.get('/admin/dashboard/stats'),
};

export const usersApi = {
  list: (params) => api.get('/admin/users', { params }),
  get: (id) => api.get(`/admin/users/${id}`),
  updateStatus: (id, status) => api.patch(`/admin/users/${id}/status`, { status }),
  delete: (id) => api.delete(`/admin/users/${id}`),
  adjustWallet: (id, data) => api.post(`/admin/users/${id}/wallet`, data),
};

export const transactionsApi = {
  list: (params) => api.get('/admin/transactions', { params }),
  get: (id) => api.get(`/admin/transactions/${id}`),
};

export const refundsApi = {
  list: (params) => api.get('/admin/refunds', { params }),
  get: (id) => api.get(`/admin/refunds/${id}`),
};

export const walletsApi = {
  history: (params) => api.get('/admin/wallets/history', { params }),
  adjust: (data) => api.post('/admin/wallets/adjust', data),
};

export const servicesApi = {
  list: () => api.get('/admin/services'),
  toggle: (id, enabled) => api.patch(`/admin/services/${id}`, { enabled }),
};

export const pricesApi = {
  list: () => api.get('/admin/services/prices'),
  update: (serviceId, data) => api.patch(`/admin/services/prices/${serviceId}`, data),
};

export const dataPlansApi = {
  list: (params) => api.get('/admin/data-plans', { params }),
  create: (data) => api.post('/admin/data-plans', data),
  update: (id, data) => api.patch(`/admin/data-plans/${id}`, data),
  delete: (id) => api.delete(`/admin/data-plans/${id}`),
};

export const kycApi = {
  list: (params) => api.get('/admin/kyc', { params }),
  get: (id) => api.get(`/admin/kyc/${id}`),
  review: (id, data) => api.patch(`/admin/kyc/${id}/review`, data),
};

export const faqApi = {
  list: () => api.get('/admin/faqs'),
  create: (data) => api.post('/admin/faqs', data),
  update: (id, data) => api.patch(`/admin/faqs/${id}`, data),
  delete: (id) => api.delete(`/admin/faqs/${id}`),
};

export const notificationsApi = {
  list: () => api.get('/admin/notifications'),
  send: (data) => api.post('/admin/notifications', data),
};

export const referralsApi = {
  list: () => api.get('/admin/referrals'),
  top: () => api.get('/admin/referrals/top'),
};

export const supportApi = {
  list: () => api.get('/admin/support/tickets'),
  get: (id) => api.get(`/admin/support/tickets/${id}`),
  reply: (id, message) => api.post(`/admin/support/tickets/${id}/reply`, { message }),
  close: (id) => api.patch(`/admin/support/tickets/${id}/close`),
};

export const settingsApi = {
  get: () => api.get('/admin/settings'),
  update: (data) => api.patch('/admin/settings', data),
  changePassword: (data) => api.patch('/admin/settings/password', data),
};

export const getErrorMessage = (error, fallback = 'Something went wrong') =>
  error?.response?.data?.message || error?.message || fallback;
