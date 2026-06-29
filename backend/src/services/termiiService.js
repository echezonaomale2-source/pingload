const axios = require('axios');
const { termii, developmentMode } = require('../config/env');
const { logApiFailure } = require('../utils/logger');

const UPSTREAM_UNAVAILABLE_MESSAGE = 'OTP service is temporarily unavailable. Please try again shortly.';

/** Normalize an upstream provider error into a user-safe message. */
const upstreamMessage = (error, fallback) => {
  const raw = error.response?.data?.message || error.message || fallback;
  // Termii returns the unhelpful "No message available" on its own 5xx errors.
  if (!raw || /no message available/i.test(raw)) return UPSTREAM_UNAVAILABLE_MESSAGE;
  return raw;
};

const OTP_PURPOSES = {
  REGISTRATION: 'registration',
  PASSWORD_RESET: 'password_reset',
};

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const otpStore = new Map();
const verifiedKeys = new Set();

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const normalizePhone = (phone) => {
  if (!phone) return null;
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('0')) digits = `234${digits.slice(1)}`;
  if (!digits.startsWith('234')) digits = `234${digits}`;
  return digits;
};

const storeKey = (email, phone, purpose) => {
  const identifier = normalizeEmail(email) || normalizePhone(phone);
  return `${purpose}:${identifier}`;
};

const markVerified = (email, phone, purpose) => {
  verifiedKeys.add(storeKey(email, phone, purpose));
};

const isVerified = (email, phone, purpose) => verifiedKeys.has(storeKey(email, phone, purpose));

const clearVerification = (email, phone, purpose) => {
  verifiedKeys.delete(storeKey(email, phone, purpose));
  otpStore.delete(storeKey(email, phone, purpose));
};

const assertTermiiConfigured = () => {
  if (developmentMode) return;
  if (!termii.apiKey) {
    const error = new Error('Termii OTP is not configured. Please contact support.');
    error.statusCode = 503;
    throw error;
  }
};

const sendDevOtp = (email, phone, purpose) => {
  const otp = generateOtp();
  const key = storeKey(email, phone, purpose);
  otpStore.set(key, {
    code: otp,
    channel: 'dev',
    expiresAt: Date.now() + OTP_EXPIRY_MS,
    attempts: 0,
    purpose,
  });
  console.log(`[DEV OTP] purpose=${purpose} email=${email || '-'} phone=${phone || '-'} code=${otp}`);
  return {
    success: true,
    message: 'OTP sent (development mode)',
    channel: 'dev',
    expiresInSeconds: OTP_EXPIRY_MS / 1000,
  };
};

const sendSmsOtp = async (phone, purpose) => {
  const to = normalizePhone(phone);
  const response = await axios.post(`${termii.baseUrl}/sms/otp/send`, {
    api_key: termii.apiKey,
    message_type: 'NUMERIC',
    to,
    from: termii.senderId,
    channel: 'generic',
    pin_attempts: 3,
    pin_time_to_live: 10,
    pin_length: 6,
    pin_placeholder: '< >',
    message_text: 'Your Pingload verification code is < >. Valid for 10 minutes.',
  });

  return {
    pinId: response.data.pinId,
    to,
    message: 'OTP sent to your phone number',
    channel: 'sms',
  };
};

const sendEmailOtp = async (email, purpose) => {
  const otp = generateOtp();
  const messageText = purpose === OTP_PURPOSES.PASSWORD_RESET
    ? 'Your Pingload password reset code is <CODE>. Valid for 10 minutes.'
    : 'Your Pingload verification code is <CODE>. Valid for 10 minutes.';

  if (termii.emailConfigurationId) {
    await axios.post(`${termii.baseUrl}/email/otp/send`, {
      api_key: termii.apiKey,
      email_address: normalizeEmail(email),
      code: otp,
      email_configuration_id: termii.emailConfigurationId,
    });
  } else {
    if (process.env.NODE_ENV === 'production') {
      const error = new Error('Email OTP is not configured. Please contact support.');
      error.statusCode = 503;
      throw error;
    }
    console.warn('[Termii] TERMII_EMAIL_CONFIGURATION_ID not set — OTP logged for email delivery fallback');
    console.log(`[EMAIL OTP] ${normalizeEmail(email)} code=${otp}`);
  }

  return {
    code: otp,
    message: 'OTP sent to your email address',
    channel: 'email',
  };
};

/**
 * Send OTP for registration or password reset.
 * Prefers SMS when phone is available, otherwise email.
 */
const sendOTP = async ({ email, phone, purpose = OTP_PURPOSES.REGISTRATION }) => {
  if (!Object.values(OTP_PURPOSES).includes(purpose)) {
    const error = new Error('Invalid OTP purpose');
    error.statusCode = 400;
    throw error;
  }

  if (!email && !phone) {
    const error = new Error('Email or phone number is required');
    error.statusCode = 400;
    throw error;
  }

  assertTermiiConfigured();

  if (developmentMode || !termii.apiKey || termii.apiKey === 'dev-placeholder') {
    return sendDevOtp(email, phone, purpose);
  }

  const key = storeKey(email, phone, purpose);
  // SMS is only attempted when explicitly requested (TERMII_OTP_CHANNEL=sms) AND a phone
  // is supplied. The default "auto" prefers email, which is the configured, reliable channel
  // and the one registration verifies against. SMS requires an approved Termii sender ID.
  const smsRequested = termii.otpChannel === 'sms' && Boolean(phone);

  if (smsRequested) {
    try {
      const smsResult = await sendSmsOtp(phone, purpose);
      otpStore.set(key, {
        pinId: smsResult.pinId,
        channel: 'sms',
        expiresAt: Date.now() + OTP_EXPIRY_MS,
        attempts: 0,
        purpose,
        destination: smsResult.to,
      });

      return {
        success: true,
        message: smsResult.message,
        channel: smsResult.channel,
        expiresInSeconds: OTP_EXPIRY_MS / 1000,
      };
    } catch (smsError) {
      logApiFailure('termii:sms-otp-send', smsError, {
        statusCode: smsError.response?.status,
        upstream: smsError.response?.data,
        destination: normalizePhone(phone),
        purpose,
      });

      // Without an email we cannot fall back, so surface the failure.
      if (!email) {
        if (process.env.NODE_ENV === 'development') return sendDevOtp(email, phone, purpose);
        const err = new Error(upstreamMessage(smsError, 'Failed to send OTP via SMS'));
        err.statusCode = 502;
        throw err;
      }
      // Otherwise fall through to email so the user is never blocked by SMS issues.
    }
  }

  try {
    const emailResult = await sendEmailOtp(email, purpose);
    otpStore.set(key, {
      code: emailResult.code,
      channel: 'email',
      expiresAt: Date.now() + OTP_EXPIRY_MS,
      attempts: 0,
      purpose,
      destination: normalizeEmail(email),
    });

    return {
      success: true,
      message: emailResult.message,
      channel: emailResult.channel,
      expiresInSeconds: OTP_EXPIRY_MS / 1000,
    };
  } catch (emailError) {
    logApiFailure('termii:email-otp-send', emailError, {
      statusCode: emailError.response?.status,
      upstream: emailError.response?.data,
      destination: normalizeEmail(email),
      purpose,
    });

    if (process.env.NODE_ENV === 'development') {
      return sendDevOtp(email, phone, purpose);
    }

    const err = new Error(upstreamMessage(emailError, 'Failed to send OTP'));
    err.statusCode = emailError.statusCode || emailError.response?.status || 502;
    throw err;
  }
};

const verifySmsOtp = async (stored, code) => {
  const response = await axios.post(`${termii.baseUrl}/sms/otp/verify`, {
    api_key: termii.apiKey,
    pin_id: stored.pinId,
    pin: code,
  });

  const verified = String(response.data?.verified).toLowerCase() === 'true';
  return verified;
};

/**
 * Verify OTP code for a given purpose.
 */
const verifyOTP = async ({ email, phone, code, purpose = OTP_PURPOSES.REGISTRATION }) => {
  if (!Object.values(OTP_PURPOSES).includes(purpose)) {
    return { success: false, message: 'Invalid OTP purpose' };
  }

  if (developmentMode) {
    const key = storeKey(email, phone, purpose);
    const stored = otpStore.get(key);
    if (stored?.code && stored.code !== code) {
      return { success: false, message: 'Invalid OTP code' };
    }
    markVerified(email, phone, purpose);
    otpStore.delete(key);
    return { success: true, message: 'OTP verified (development mode)' };
  }

  const key = storeKey(email, phone, purpose);
  const stored = otpStore.get(key);

  if (!stored) {
    return { success: false, message: 'OTP expired or not found. Request a new one.' };
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(key);
    return { success: false, message: 'OTP has expired. Request a new one.' };
  }

  if (stored.attempts >= MAX_ATTEMPTS) {
    otpStore.delete(key);
    return { success: false, message: 'Too many attempts. Request a new OTP.' };
  }

  try {
    let valid = false;

    if (stored.channel === 'sms' && stored.pinId) {
      valid = await verifySmsOtp(stored, code);
    } else if (stored.code) {
      valid = stored.code === code;
    }

    if (!valid) {
      stored.attempts += 1;
      return { success: false, message: 'Invalid OTP code' };
    }

    markVerified(email, phone, purpose);
    otpStore.delete(key);
    return { success: true, message: 'OTP verified successfully' };
  } catch (error) {
    stored.attempts += 1;
    const message = error.response?.data?.message || 'OTP verification failed';
    return { success: false, message };
  }
};

const isEmailOtpVerified = (email, purpose = OTP_PURPOSES.REGISTRATION) =>
  isVerified(email, null, purpose);

const clearEmailVerification = (email, purpose = OTP_PURPOSES.REGISTRATION) =>
  clearVerification(email, null, purpose);

module.exports = {
  OTP_PURPOSES,
  sendOTP,
  verifyOTP,
  isEmailOtpVerified,
  clearEmailVerification,
  isVerified,
};
