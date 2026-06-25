import api from './api';

export const kycService = {
  getStatus: () => api.get('/kyc/status'),
  submit: (data) => api.post('/kyc/submit', data),
};
