const serviceConfig = require('../config/serviceConfig');

const getServiceConfig = (_req, res) => {
  res.json({
    success: true,
    data: serviceConfig.getPublicConfig(),
  });
};

const getSampleRequests = (_req, res) => {
  const baseUrl = `http://localhost:${process.env.PORT || 5003}/api`;

  res.json({
    success: true,
    message: 'Pingload development sample requests',
    data: {
      baseUrl,
      note: 'These routes are available only when NODE_ENV=development. Replace tokens and IDs with real values.',
      auth: {
        registerFlow: [
          { method: 'POST', url: `${baseUrl}/auth/send-otp`, body: { email: 'user@example.com', phone: '08012345678', purpose: 'registration' } },
          { method: 'POST', url: `${baseUrl}/auth/verify-otp`, body: { email: 'user@example.com', otp: '123456', phone: '08012345678', purpose: 'registration' } },
          { method: 'POST', url: `${baseUrl}/auth/register`, body: { fullName: 'John Doe', email: 'user@example.com', phoneNumber: '08012345678', password: 'secret123' } },
        ],
        login: { method: 'POST', url: `${baseUrl}/auth/login`, body: { email: 'user@example.com', password: 'secret123' } },
        passwordResetFlow: [
          { method: 'POST', url: `${baseUrl}/auth/forgot-password`, body: { email: 'user@example.com' } },
          { method: 'POST', url: `${baseUrl}/auth/reset-password`, body: { email: 'user@example.com', otp: '123456', newPassword: 'newsecret123' } },
        ],
      },
      wallet: {
        headers: { Authorization: 'Bearer <JWT_TOKEN>' },
        getBalance: { method: 'GET', url: `${baseUrl}/wallet/balance` },
        fundWallet: { method: 'POST', url: `${baseUrl}/wallet/fund`, body: { amount: 1000 } },
        verifyFunding: { method: 'GET', url: `${baseUrl}/wallet/verify/<PAYSTACK_REFERENCE>` },
        transfer: { method: 'POST', url: `${baseUrl}/wallet/transfer`, body: { recipient: 'friend@example.com', amount: 500, pin: '1234', note: 'Test transfer' } },
        paymentConfig: { method: 'GET', url: `${baseUrl}/wallet/payment-config` },
      },
      paystack: {
        webhook: { method: 'POST', url: `${baseUrl}/webhooks/paystack`, headers: { 'x-paystack-signature': '<HMAC_SHA512_SIGNATURE>' }, note: 'Use Paystack test cards in checkout' },
        testCards: [
          { number: '4084084084084081', cvv: '408', expiry: '12/30', pin: '0000', otp: '123456' },
          { number: '5060666666666666666', cvv: '123', expiry: '12/30', note: 'Declined card for failure testing' },
        ],
      },
      vtpass: {
        headers: { Authorization: 'Bearer <JWT_TOKEN>' },
        airtime: { method: 'POST', url: `${baseUrl}/vtu/airtime`, body: { network: 'mtn', phone: '08012345678', amount: 100, pin: '1234' } },
        dataPlans: { method: 'GET', url: `${baseUrl}/vtu/data-plans/mtn` },
        data: { method: 'POST', url: `${baseUrl}/vtu/data`, body: { network: 'mtn', phone: '08012345678', variationCode: 'mtn-1gb', amount: 500, pin: '1234' } },
        electricityVerify: { method: 'POST', url: `${baseUrl}/vtu/electricity/verify`, body: { provider: 'ikeja', meterNumber: '12345678901', meterType: 'prepaid' } },
        electricity: { method: 'POST', url: `${baseUrl}/vtu/electricity`, body: { provider: 'ikeja', meterNumber: '12345678901', meterType: 'prepaid', amount: 2000, phone: '08012345678', pin: '1234' } },
        tvPackages: { method: 'GET', url: `${baseUrl}/vtu/tv-packages/dstv` },
        tvVerify: { method: 'POST', url: `${baseUrl}/vtu/tv/verify`, body: { provider: 'dstv', smartcardNumber: '1234567890' } },
        tv: { method: 'POST', url: `${baseUrl}/vtu/tv`, body: { provider: 'dstv', smartcardNumber: '1234567890', variationCode: 'dstv-padi', amount: 2950, phone: '08012345678', pin: '1234' } },
        sandboxNote: 'Use VTpass sandbox credentials. Purchases are simulated and do not charge real money.',
      },
      pin: {
        createPin: { method: 'POST', url: `${baseUrl}/pin/create`, body: { pin: '1234' } },
        verifyPin: { method: 'POST', url: `${baseUrl}/pin/verify`, body: { pin: '1234' } },
      },
    },
  });
};

const getHealth = (_req, res) => {
  res.json({
    success: true,
    message: 'Pingload development API',
    timestamp: new Date().toISOString(),
    services: serviceConfig.getPublicConfig(),
  });
};

module.exports = {
  getServiceConfig,
  getSampleRequests,
  getHealth,
};
