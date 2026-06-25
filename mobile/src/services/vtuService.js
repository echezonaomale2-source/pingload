import api from './api';

const createIdempotencyKey = () =>
  `vtu-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const post = (url, data) => api.post(url, data, {
  headers: { 'Idempotency-Key': createIdempotencyKey() },
});

export const vtuService = {
  buyAirtime: (data) => post('/vtu/airtime', data),
  getDataPlans: (network) => api.get(`/vtu/data-plans/${network}`),
  buyData: (data) => post('/vtu/data', data),
  payElectricity: (data) => post('/vtu/electricity', data),
  verifyElectricityMeter: (data) => api.post('/vtu/electricity/verify', data),
  getTVPackages: (provider) => api.get(`/vtu/tv-packages/${provider}`),
  verifyTVSmartcard: (data) => api.post('/vtu/tv/verify', data),
  payTV: (data) => post('/vtu/tv', data),
  buyEducationPin: (data) => post('/vtu/education', data),
  getEducationProducts: () => api.get('/vtu/education-products', { skipGlobalLoader: true }),
  fundBetting: (data) => post('/vtu/betting', data),
};
