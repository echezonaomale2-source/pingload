import api from './api';

export const OTP_PURPOSE = {
  REGISTRATION: 'registration',
  PASSWORD_RESET: 'password_reset',
};

export const authService = {
  getConfig: () => api.get('/auth/config', { skipGlobalLoader: true }),
  sendOtp: ({ email, phone, purpose = OTP_PURPOSE.REGISTRATION }) =>
    api.post('/auth/send-otp', { email, phone, purpose }),
  verifyOtp: ({ email, otp, phone, purpose = OTP_PURPOSE.REGISTRATION }) =>
    api.post('/auth/verify-otp', { email, otp, phone, purpose }),
  register: (data) => api.post('/auth/register', data),
  login: (email, password) => api.post('/auth/login', { email, password }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  updateSettings: (data) => api.put('/auth/settings', data),
  updateAvatar: (avatar) => api.put('/auth/avatar', { avatar }),
  removeAvatar: () => api.delete('/auth/avatar'),
};
