import api from './api';

export const pinService = {
  getStatus: () => api.get('/pin/status', { skipGlobalLoader: true }),
  create: (pin) => api.post('/pin/create', { pin }),
  change: (currentPin, newPin) => api.put('/pin/change', { currentPin, newPin }),
  verify: (pin) => api.post('/pin/verify', { pin }),
  forgotPin: () => api.post('/pin/forgot'),
  resetWithOtp: (otp, newPin) => api.post('/pin/reset-with-otp', { otp, newPin }),
};
