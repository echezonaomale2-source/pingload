const serviceConfig = require('../config/serviceConfig');

const SENSITIVE_KEYS = ['password', 'pin', 'otp', 'authorization', 'api_key', 'secret', 'token', 'pin_id'];

const sanitize = (value, depth = 0) => {
  if (depth > 4) return '[MaxDepth]';
  if (value == null) return value;
  if (typeof value === 'string' && value.length > 500) return `${value.slice(0, 500)}...[truncated]`;
  if (Array.isArray(value)) return value.map((item) => sanitize(item, depth + 1));
  if (typeof value !== 'object') return value;

  return Object.entries(value).reduce((acc, [key, val]) => {
    if (SENSITIVE_KEYS.some((k) => key.toLowerCase().includes(k))) {
      acc[key] = '[REDACTED]';
    } else {
      acc[key] = sanitize(val, depth + 1);
    }
    return acc;
  }, {});
};

const timestamp = () => new Date().toISOString();

const shouldLog = () => serviceConfig.loggingEnabled;

const logPaystack = (level, message, meta = {}) => {
  if (!shouldLog()) return;
  console.log(JSON.stringify({ ts: timestamp(), provider: 'paystack', level, message, ...sanitize(meta) }));
};

const logVtpass = (level, message, meta = {}) => {
  if (!shouldLog()) return;
  console.log(JSON.stringify({ ts: timestamp(), provider: 'vtpass', level, message, ...sanitize(meta) }));
};

const logWallet = (level, message, meta = {}) => {
  if (!shouldLog()) return;
  console.log(JSON.stringify({ ts: timestamp(), provider: 'wallet', level, message, ...sanitize(meta) }));
};

const logApiFailure = (context, error, meta = {}) => {
  console.error(JSON.stringify({
    ts: timestamp(),
    provider: 'api',
    level: 'error',
    context,
    message: error?.message || 'Unknown error',
    statusCode: error?.statusCode || error?.response?.status,
    stack: serviceConfig.isDevelopment ? error?.stack : undefined,
    ...sanitize(meta),
  }));
};

module.exports = {
  sanitize,
  logPaystack,
  logVtpass,
  logWallet,
  logApiFailure,
};
