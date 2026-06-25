const serviceConfig = require('./serviceConfig');

const defaults = {
  MONGODB_URI: 'mongodb://127.0.0.1:27017/pingload',
  JWT_SECRET: 'pingload-local-dev-jwt-secret-change-in-production',
};

const requireEnv = (key) => {
  if (!process.env[key]) {
    throw new Error(`${key} must be set when NODE_ENV=production`);
  }
};

const rejectPlaceholder = (key, placeholders = []) => {
  const value = process.env[key] || '';
  if (placeholders.some((p) => value.includes(p))) {
    throw new Error(`${key} contains a placeholder value — set a live credential before production deploy`);
  }
};

if (serviceConfig.isProduction) {
  [
    'MONGODB_URI',
    'JWT_SECRET',
    'PAYSTACK_SECRET_KEY',
    'PAYSTACK_PUBLIC_KEY',
    'VTPASS_API_KEY',
    'VTPASS_SECRET_KEY',
    'TERMII_API_KEY',
    'ADMIN_PASSWORD',
    'CORS_ORIGIN',
    'FRONTEND_URL',
    'API_PUBLIC_URL',
  ].forEach(requireEnv);

  if (serviceConfig.serviceMode !== 'production' && serviceConfig.serviceMode !== 'live') {
    throw new Error('SERVICE_MODE must be "production" when NODE_ENV=production');
  }

  if (serviceConfig.paystack.isTestMode) {
    throw new Error('Paystack test keys (sk_test_*) cannot be used when NODE_ENV=production');
  }

  if (serviceConfig.vtpass.isSandbox) {
    throw new Error('VTpass sandbox cannot be used when NODE_ENV=production');
  }

  if (serviceConfig.developmentMode) {
    throw new Error('DEVELOPMENT_MODE must be false when NODE_ENV=production');
  }

  if (process.env.JWT_SECRET === defaults.JWT_SECRET) {
    throw new Error('JWT_SECRET must be changed from the default dev value in production');
  }

  if (process.env.ADMIN_PASSWORD === 'admin123') {
    throw new Error('ADMIN_PASSWORD must be changed from the default in production');
  }

  ['PAYSTACK_SECRET_KEY', 'PAYSTACK_PUBLIC_KEY', 'VTPASS_API_KEY', 'VTPASS_SECRET_KEY', 'TERMII_API_KEY'].forEach((key) => {
    rejectPlaceholder(key, ['<your-', 'xxx', 'dev-placeholder']);
  });
} else if (serviceConfig.isDevelopment) {
  ['PAYSTACK_SECRET_KEY', 'VTPASS_API_KEY'].forEach((key) => {
    if (!process.env[key] || process.env[key].includes('<your-')) {
      console.warn(`Warning: ${key} is not set — wallet funding and VTU purchases will be limited`);
    }
  });
}

const parseCorsOrigins = () => {
  const raw = process.env.CORS_ORIGIN || '';
  if (!raw) {
    return serviceConfig.isProduction ? [] : ['http://localhost:5174', 'http://localhost:8081'];
  }
  return raw.split(',').map((origin) => origin.trim()).filter(Boolean);
};

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5003,
  nodeEnv: serviceConfig.nodeEnv,
  serviceMode: serviceConfig.serviceMode,
  isSandboxMode: serviceConfig.isSandboxMode,
  isProduction: serviceConfig.isProduction,
  mongodbUri: process.env.MONGODB_URI || defaults.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET || defaults.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  termii: {
    apiKey: process.env.TERMII_API_KEY,
    senderId: process.env.TERMII_SENDER_ID || 'Pingload',
    baseUrl: serviceConfig.termii.baseUrl,
    emailConfigurationId: process.env.TERMII_EMAIL_CONFIGURATION_ID,
    otpChannel: process.env.TERMII_OTP_CHANNEL || 'auto',
  },
  paystack: serviceConfig.paystack,
  vtpass: serviceConfig.vtpass,
  apiPublicUrl: process.env.API_PUBLIC_URL || '',
  frontendUrl: process.env.FRONTEND_URL || (serviceConfig.isProduction ? '' : 'http://localhost:8081'),
  corsOrigins: parseCorsOrigins(),
  referralBonus: parseInt(process.env.REFERRAL_BONUS, 10) || 100,
  developmentMode: serviceConfig.developmentMode,
  adminEmail: process.env.ADMIN_EMAIL || 'admin@pingload.top',
  adminPassword: process.env.ADMIN_PASSWORD || (serviceConfig.isProduction ? null : 'admin123'),
  supportEmail: serviceConfig.app.supportEmail,
  supportWhatsapp: serviceConfig.app.supportWhatsapp,
  serviceConfig,
};
