import api from './api';

/** VTpass catalog sync can exceed the default 30s client timeout. */
const SYNC_TIMEOUT = 180000;

export const adminAuth = {
  login: (email, password) => api.post('/admin/auth/login', { email, password }, { skipAuthLogout: true }),
  logout: () => api.post('/admin/auth/logout', {}, { skipAuthLogout: true, skipGlobalLoader: true }),
  me: () => api.get('/admin/auth/me', { skipGlobalLoader: true }),
};

export const searchApi = {
  query: (q) => api.get('/admin/search', { params: { q }, skipGlobalLoader: true }),
};

export const inboxApi = {
  list: (params) => api.get('/admin/inbox', { params, skipGlobalLoader: true }),
  unreadCount: () => api.get('/admin/inbox/unread-count', { skipGlobalLoader: true }),
  markRead: (ids) => api.patch('/admin/inbox/read', { ids }, { skipGlobalLoader: true }),
};

export const dashboardApi = {
  getStats: () => api.get('/admin/dashboard/stats'),
};

export const revenueApi = {
  getDashboard: () => api.get('/admin/dashboard/revenue'),
};

export const securityEventsApi = {
  list: (params) => api.get('/admin/security-events', { params }),
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
  sync: (params) => api.post('/admin/data-plans/sync', {}, { params, timeout: SYNC_TIMEOUT }),
};
export const electricityPlansApi = {
  list: () => api.get('/admin/electricity-plans'),
  create: (data) => api.post('/admin/electricity-plans', data),
  update: (id, data) => api.patch(`/admin/electricity-plans/${id}`, data),
  delete: (id) => api.delete(`/admin/electricity-plans/${id}`),
  sync: () => api.post('/admin/electricity-plans/sync', {}, { timeout: SYNC_TIMEOUT }),
};

export const tvPlansApi = {
  list: (params) => api.get('/admin/tv-plans', { params }),
  create: (data) => api.post('/admin/tv-plans', data),
  update: (id, data) => api.patch(`/admin/tv-plans/${id}`, data),
  delete: (id) => api.delete(`/admin/tv-plans/${id}`),
  sync: (params) => api.post('/admin/tv-plans/sync', {}, { params, timeout: SYNC_TIMEOUT }),
};

export const educationProductsApi = {
  list: (params) => api.get('/admin/education-products', { params }),
  create: (data) => api.post('/admin/education-products', data),
  update: (id, data) => api.patch(`/admin/education-products/${id}`, data),
  delete: (id) => api.delete(`/admin/education-products/${id}`),
  purchases: (params) => api.get('/admin/education/purchases', { params }),
  sync: () => api.post('/admin/education-products/sync', {}, { timeout: SYNC_TIMEOUT }),
};

export const bettingPlatformsApi = {
  list: () => api.get('/admin/betting-platforms'),
  update: (id, data) => api.patch(`/admin/betting-platforms/${id}`, data),
  sync: () => api.post('/admin/betting-platforms/sync'),
};

export const providerLogosApi = {
  list: () => api.get('/admin/provider-logos'),
  update: (id, data) => api.patch(`/admin/provider-logos/${id}`, data),
  remove: (id) => api.delete(`/admin/provider-logos/${id}`),
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

export const providersApi = {
  get: () => api.get('/admin/providers'),
  setDataEnabled: (providerId, enabled) => api.patch(`/admin/providers/${providerId}/data-enabled`, { enabled }),
  updateRouting: (serviceRouting) => api.patch('/admin/providers/routing', { serviceRouting }),
  updateFailover: (data) => api.patch('/admin/providers/failover', data),
  test: (providerId) => api.post(`/admin/providers/${providerId}/test`),
  syncData: (providerId, params) => api.post(`/admin/providers/${providerId}/sync/data`, {}, { params, timeout: SYNC_TIMEOUT }),
  syncTv: (providerId, params) => api.post(`/admin/providers/${providerId}/sync/tv`, {}, { params, timeout: SYNC_TIMEOUT }),
  syncAllData: () => api.post('/admin/providers/sync-all-data', {}, { timeout: SYNC_TIMEOUT }),
};

export const getErrorMessage = (error, fallback = 'Something went wrong') =>
  error?.response?.data?.message || error?.message || fallback;
