require('dotenv').config();

const nodeEnv = process.env.NODE_ENV || 'development';
const isProduction = nodeEnv === 'production';

/**
 * SERVICE_MODE controls Paystack + VTpass environments together.
 * - sandbox | test | development  → Paystack test keys + VTpass sandbox
 * - production | live             → Paystack live keys + VTpass live
 *
 * Defaults to "production" when NODE_ENV=production, otherwise "sandbox".
 * Individual overrides: PAYSTACK_ENV=test|live, VTPASS_ENV=sandbox|live
 */
const SERVICE_MODE = (process.env.SERVICE_MODE || (isProduction ? 'production' : 'sandbox')).toLowerCase();

const SANDBOX_MODES = new Set(['sandbox', 'test', 'development', 'dev']);
const isSandboxMode = SANDBOX_MODES.has(SERVICE_MODE);

const paystackEnv = (process.env.PAYSTACK_ENV || (isSandboxMode ? 'test' : 'live')).toLowerCase();
const vtpassEnv = (process.env.VTPASS_ENV || (isSandboxMode ? 'sandbox' : 'live')).toLowerCase();

const PAYSTACK_BASE_URL = process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';

const VTPASS_BASE_URL = process.env.VTPASS_BASE_URL
  || (vtpassEnv === 'live' ? 'https://vtpass.com/api' : 'https://sandbox.vtpass.com/api');

const maskKey = (key) => {
  if (!key) return null;
  if (key.length <= 8) return '****';
  return `${key.slice(0, 7)}...${key.slice(-4)}`;
};

const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';
const paystackPublicKey = process.env.PAYSTACK_PUBLIC_KEY || '';

const paystackIsTest = paystackEnv === 'test' || paystackSecretKey.startsWith('sk_test_');
const vtpassIsSandbox = vtpassEnv === 'sandbox';

const resolveDevelopmentMode = () => {
  if (isProduction) return process.env.DEVELOPMENT_MODE === 'true';
  if (process.env.DEVELOPMENT_MODE === 'false') return false;
  return process.env.DEVELOPMENT_MODE === 'true';
};

const termiiApiKey = process.env.TERMII_API_KEY || '';
const termiiConfigured = Boolean(termiiApiKey && termiiApiKey !== 'dev-placeholder');

const serviceConfig = {
  nodeEnv,
  serviceMode: SERVICE_MODE,
  isDevelopment: !isProduction,
  isProduction,
  isSandboxMode,
  loggingEnabled: process.env.ENABLE_SERVICE_LOGS !== 'false',

  paystack: {
    env: paystackEnv,
    mode: paystackIsTest ? 'test' : 'live',
    baseUrl: PAYSTACK_BASE_URL,
    secretKey: paystackSecretKey,
    publicKey: paystackPublicKey,
    isTestMode: paystackIsTest,
    webhookUrl: '/api/webhooks/paystack',
    configured: Boolean(paystackSecretKey && paystackPublicKey),
  },

  vtpass: {
    env: vtpassEnv,
    mode: vtpassIsSandbox ? 'sandbox' : 'live',
    baseUrl: VTPASS_BASE_URL,
    apiKey: process.env.VTPASS_API_KEY || '',
    publicKey: process.env.VTPASS_PUBLIC_KEY || '',
    secretKey: process.env.VTPASS_SECRET_KEY || '',
    isSandbox: vtpassIsSandbox,
    configured: Boolean(process.env.VTPASS_API_KEY && process.env.VTPASS_SECRET_KEY),
  },

  termii: {
    baseUrl: process.env.TERMII_BASE_URL || 'https://api.ng.termii.com/api',
    apiKey: termiiApiKey,
    senderId: process.env.TERMII_SENDER_ID || 'Pingload',
    configured: termiiConfigured,
  },

  app: {
    apiPublicUrl: process.env.API_PUBLIC_URL || '',
    frontendUrl: process.env.FRONTEND_URL || '',
    corsOrigin: process.env.CORS_ORIGIN || '',
    appDomain: process.env.APP_DOMAIN || 'pingload.top',
    privacyPolicyUrl: process.env.PRIVACY_POLICY_URL || 'https://pingload.top/privacy',
    termsUrl: process.env.TERMS_URL || 'https://pingload.top/terms',
    supportEmail: process.env.SUPPORT_EMAIL || 'support@pingload.top',
    supportWhatsapp: process.env.SUPPORT_WHATSAPP || '',
  },

  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    configured: Boolean(
      process.env.FIREBASE_PROJECT_ID
      && process.env.FIREBASE_CLIENT_EMAIL
      && process.env.FIREBASE_PRIVATE_KEY
    ),
  },

  developmentMode: resolveDevelopmentMode(),
};

serviceConfig.getPublicConfig = () => ({
  nodeEnv: serviceConfig.nodeEnv,
  serviceMode: serviceConfig.serviceMode,
  isSandboxMode: serviceConfig.isSandboxMode,
  isProduction: serviceConfig.isProduction,
  developmentMode: serviceConfig.developmentMode,
  paystack: {
    mode: serviceConfig.paystack.mode,
    baseUrl: serviceConfig.paystack.baseUrl,
    publicKey: maskKey(serviceConfig.paystack.publicKey),
    isTestMode: serviceConfig.paystack.isTestMode,
    configured: serviceConfig.paystack.configured,
  },
  vtpass: {
    mode: serviceConfig.vtpass.mode,
    baseUrl: serviceConfig.vtpass.baseUrl,
    isSandbox: serviceConfig.vtpass.isSandbox,
    configured: serviceConfig.vtpass.configured,
  },
  termii: {
    configured: serviceConfig.termii.configured,
  },
  firebase: {
    configured: serviceConfig.firebase.configured,
  },
});

serviceConfig.getAppConfig = () => {
  const apiBase = (serviceConfig.app.apiPublicUrl || 'https://pingload.top').replace(/\/$/, '');
  return {
    apiPublicUrl: serviceConfig.app.apiPublicUrl || null,
    appDomain: serviceConfig.app.appDomain,
    privacyPolicyUrl: serviceConfig.app.privacyPolicyUrl,
    termsUrl: serviceConfig.app.termsUrl,
    supportEmail: serviceConfig.app.supportEmail,
    supportWhatsapp: serviceConfig.app.supportWhatsapp || null,
    paystackPublicKey: serviceConfig.paystack.publicKey || null,
    paystackMode: serviceConfig.paystack.mode,
    serviceMode: serviceConfig.serviceMode,
    webhookUrl: `${apiBase}/api/webhooks/paystack`,
  };
};

serviceConfig.printStartupBanner = () => {
  if (isProduction) {
    console.log(`Pingload API [PRODUCTION] — Paystack ${serviceConfig.paystack.mode}, VTpass ${serviceConfig.vtpass.mode}`);
    return;
  }

  console.log('\n========================================');
  console.log('  Pingload Service Configuration');
  console.log('========================================');
  console.log(`  NODE_ENV       : ${nodeEnv}`);
  console.log(`  SERVICE_MODE   : ${SERVICE_MODE}`);
  console.log(`  Paystack       : ${serviceConfig.paystack.mode.toUpperCase()} (${serviceConfig.paystack.baseUrl})`);
  console.log(`  Paystack Key   : ${maskKey(paystackSecretKey) || 'NOT SET'}`);
  console.log(`  VTpass         : ${serviceConfig.vtpass.mode.toUpperCase()} (${serviceConfig.vtpass.baseUrl})`);
  console.log(`  VTpass Key     : ${maskKey(process.env.VTPASS_API_KEY) || 'NOT SET'}`);
  console.log(`  Dev OTP Mode   : ${serviceConfig.developmentMode ? 'ON (OTP logged)' : 'OFF'}`);
  console.log(`  Service Logs   : ${serviceConfig.loggingEnabled ? 'ON' : 'OFF'}`);
  console.log(`  FCM Push       : ${serviceConfig.firebase.configured ? 'ON' : 'OFF'}`);
  console.log('========================================\n');
};

module.exports = serviceConfig;
