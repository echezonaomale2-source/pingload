import api from './api';
import { LOADING_MESSAGES } from '../utils/loadingMessages';

const createIdempotencyKey = () =>
  `ping-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

const withIdempotency = (config = {}) => ({
  ...config,
  headers: {
    ...(config.headers || {}),
    'Idempotency-Key': createIdempotencyKey(),
  },
});

export const walletService = {
  getBalance: () => api.get('/wallet/balance', { skipGlobalLoader: true }),
  getPaymentConfig: () => api.get('/wallet/payment-config', { skipGlobalLoader: true }),
  fundWallet: (amount) => api.post('/wallet/fund', { amount }, withIdempotency()),
  transfer: (data) => api.post('/wallet/transfer', data),
  verifyFunding: (reference) => api.get(`/wallet/verify/${reference}`, {
    showGlobalLoader: true,
    loadingMessage: LOADING_MESSAGES.VERIFY_PAYMENT,
  }),
  getHistory: () => api.get('/wallet/history', { skipGlobalLoader: true }),
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isPendingPaymentError = (error) =>
  error.response?.status === 402 || error.response?.data?.code === 'PAYMENT_PENDING';

export const verifyFundingWithRetry = async (reference, { attempts = 12, delayMs = 5000 } = {}) => {
  let lastError;

  for (let i = 0; i < attempts; i += 1) {
    try {
      return await walletService.verifyFunding(reference);
    } catch (error) {
      lastError = error;

      if (isPendingPaymentError(error) && i < attempts - 1) {
        await sleep(delayMs);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
};
