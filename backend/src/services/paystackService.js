const axios = require('axios');
const crypto = require('crypto');
const serviceConfig = require('../config/serviceConfig');
const { attachPaystackLogger } = require('../utils/httpLogger');

const paystackApi = attachPaystackLogger(axios.create({
  baseURL: serviceConfig.paystack.baseUrl,
  timeout: 30000,
  headers: {
    Authorization: `Bearer ${serviceConfig.paystack.secretKey}`,
    'Content-Type': 'application/json',
  },
}));

const handlePaystackError = (error) => {
  const message = error.response?.data?.message || error.message || 'Paystack request failed';
  const err = new Error(message);
  err.statusCode = error.response?.status || 502;
  err.isPaystackError = true;
  throw err;
};

const initializeTransaction = async ({ email, amount, reference, callbackUrl, metadata = {} }) => {
  try {
    const response = await paystackApi.post('/transaction/initialize', {
      email,
      amount: Math.round(amount * 100),
      reference,
      callback_url: callbackUrl,
      metadata: {
        purpose: 'wallet_funding',
        environment: serviceConfig.paystack.mode,
        ...metadata,
      },
    });

    return response.data.data;
  } catch (error) {
    handlePaystackError(error);
  }
};

const verifyTransaction = async (reference) => {
  try {
    const response = await paystackApi.get(`/transaction/verify/${reference}`);
    return response.data.data;
  } catch (error) {
    handlePaystackError(error);
  }
};

const verifyWebhookSignature = (rawBody, signature) => {
  if (!serviceConfig.paystack.secretKey || !signature) return false;

  const hash = crypto
    .createHmac('sha512', serviceConfig.paystack.secretKey)
    .update(rawBody)
    .digest('hex');

  const received = Buffer.from(String(signature), 'hex');
  const expected = Buffer.from(hash, 'hex');

  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
};

module.exports = {
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
};
