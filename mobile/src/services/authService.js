import api from './api';

export const OTP_PURPOSE = {
  REGISTRATION: 'registration',
  PASSWORD_RESET: 'password_reset',
};

const AVATAR_TIMEOUT_MS = 45000;

export const authService = {
  getConfig: () => api.get('/auth/config', { skipGlobalLoader: true }),
  sendOtp: ({ email, phone, purpose = OTP_PURPOSE.REGISTRATION }) =>
    api.post('/auth/send-otp', { email, phone, purpose }),
  verifyOtp: ({ email, otp, phone, purpose = OTP_PURPOSE.REGISTRATION }) =>
    api.post('/auth/verify-otp', { email, otp, phone, purpose }),
  register: (data) => api.post('/auth/register', data),
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout', {}, { skipGlobalLoader: true }),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getProfile: () => api.get('/auth/profile', { skipGlobalLoader: true }),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
  updateSettings: (data) => api.put('/auth/settings', data),
  updateAvatar: (avatar, { onProgress } = {}) =>
    api.put('/auth/avatar', { avatar }, {
      timeout: AVATAR_TIMEOUT_MS,
      skipGlobalLoader: true,
      onUploadProgress: (event) => {
        if (!onProgress || !event.total) return;
        const percent = Math.min(100, Math.round((event.loaded / event.total) * 100));
        onProgress(percent);
      },
    }),
  updateAvatarWithRetry: async (avatar, { retries = 2, onProgress } = {}) => {
    let lastError;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        if (onProgress) onProgress(attempt === 0 ? 0 : 5);
        return await authService.updateAvatar(avatar, { onProgress });
      } catch (error) {
        lastError = error;
        if (attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    }
    throw lastError;
  },
  removeAvatar: () => api.delete('/auth/avatar', { skipGlobalLoader: true }),
  deleteAccount: (password) => api.delete('/auth/account', { data: { password } }),
  getLoginPinStatus: () => api.get('/auth/login-pin/status', { skipGlobalLoader: true }),
  setupLoginPin: (pin) => api.post('/auth/login-pin/setup', { pin }, { skipGlobalLoader: true }),
  verifyLoginPin: (data) => api.post('/auth/login-pin/verify', data, { skipGlobalLoader: true }),
  confirmBiometricUnlock: (data) => api.post('/auth/login-pin/biometric-unlock', data || {}, { skipGlobalLoader: true }),
};
