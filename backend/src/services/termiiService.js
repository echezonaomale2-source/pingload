const axios = require('axios');
const OtpChallenge = require('../models/OtpChallenge');
const { termii, developmentMode } = require('../config/env');
const { logApiFailure } = require('../utils/logger');

const UPSTREAM_UNAVAILABLE_MESSAGE = 'OTP service is temporarily unavailable. Please try again shortly.';
/** Window after successful verify during which register/reset may proceed. */
const VERIFIED_TTL_MS = 10 * 60 * 1000;
/** Email-delivery friendly OTP lifetime (was 90s — too short for real-world email lag). */
const OTP_EXPIRY_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

/** Normalize an upstream provider error into a user-safe message. */
const upstreamMessage = (error, fallback) => {
  const raw = error.response?.data?.message || error.message || fallback;
  if (!raw || /no message available/i.test(raw)) return UPSTREAM_UNAVAILABLE_MESSAGE;
  return raw;
};

const OTP_PURPOSES = {
  REGISTRATION: 'registration',
  PASSWORD_RESET: 'password_reset',
  TRANSACTION_PIN_RESET: 'transaction_pin_reset',
  LOGIN_PIN_RESET: 'login_pin_reset',
};

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const normalizeEmail = (email) => String(email || '').trim().toLowerCase();

const normalizeOtpCode = (code) => String(code || '').trim().replace(/\s+/g, '');

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

const logOtp = (event, payload = {}) => {
  console.log(`[OTP] ${event}`, {
    ...payload,
    at: new Date().toISOString(),
  });
};

const saveOtpChallenge = async (key, data) => {
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
  const doc = await OtpChallenge.findOneAndUpdate(
    { key },
    {
      key,
      code: data.code || null,
      pinId: data.pinId || null,
      channel: data.channel,
      attempts: data.attempts ?? 0,
      purpose: data.purpose,
      verified: false,
      destination: data.destination || null,
      expiresAt,
    },
    { upsert: true, new: true }
  );
  logOtp('challenge_saved', {
    key,
    channel: data.channel,
    purpose: data.purpose,
    destination: data.destination || null,
    expiresAt: expiresAt.toISOString(),
    hasCode: Boolean(data.code),
    hasPinId: Boolean(data.pinId),
    id: String(doc._id),
  });
  return doc;
};

/**
 * Convert the pending OTP document into a verified marker that register/reset
 * endpoints can read. Must NOT delete this document afterward — that was the
 * production bug that caused "OTP expired or not found" / register failures.
 */
const markVerified = async (email, phone, purpose) => {
  const key = storeKey(email, phone, purpose);
  const expiresAt = new Date(Date.now() + VERIFIED_TTL_MS);
  const doc = await OtpChallenge.findOneAndUpdate(
    { key },
    {
      key,
      channel: 'verified',
      purpose,
      verified: true,
      attempts: 0,
      code: null,
      pinId: null,
      expiresAt,
    },
    { upsert: true, new: true }
  );
  logOtp('mark_verified', {
    key,
    purpose,
    expiresAt: expiresAt.toISOString(),
    id: doc ? String(doc._id) : null,
  });
  return doc;
};

const isVerified = async (email, phone, purpose) => {
  const key = storeKey(email, phone, purpose);
  const now = new Date();
  const doc = await OtpChallenge.findOne({
    key,
    verified: true,
    expiresAt: { $gt: now },
  }).select('_id expiresAt').lean();
  logOtp('is_verified_lookup', {
    key,
    purpose,
    found: Boolean(doc),
    expiresAt: doc?.expiresAt ? new Date(doc.expiresAt).toISOString() : null,
  });
  return Boolean(doc);
};

const clearVerification = async (email, phone, purpose) => {
  const key = storeKey(email, phone, purpose);
  const result = await OtpChallenge.deleteOne({ key });
  logOtp('clear_verification', { key, purpose, deleted: result.deletedCount });
};

const assertTermiiConfigured = () => {
  if (developmentMode) return;
  if (!termii.apiKey) {
    const error = new Error('Termii OTP is not configured. Please contact support.');
    error.statusCode = 503;
    throw error;
  }
};

const sendDevOtp = async (email, phone, purpose) => {
  const otp = generateOtp();
  const key = storeKey(email, phone, purpose);
  logOtp('generate', { key, purpose, channel: 'dev', codeLength: otp.length });
  await saveOtpChallenge(key, {
    code: otp,
    channel: 'dev',
    attempts: 0,
    purpose,
    destination: normalizeEmail(email) || normalizePhone(phone),
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
  const ttlMinutes = Math.max(1, Math.ceil(OTP_EXPIRY_MS / 60000));
  const response = await axios.post(`${termii.baseUrl}/sms/otp/send`, {
    api_key: termii.apiKey,
    message_type: 'NUMERIC',
    to,
    from: termii.senderId,
    channel: 'generic',
    pin_attempts: 3,
    pin_time_to_live: ttlMinutes,
    pin_length: 6,
    pin_placeholder: '< >',
    message_text: `Your Pingload verification code is < >. Valid for ${ttlMinutes} minute(s).`,
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
  const ttlMinutes = Math.max(1, Math.ceil(OTP_EXPIRY_MS / 60000));
  const messageText = purpose === OTP_PURPOSES.PASSWORD_RESET
    ? `Your Pingload password reset code is <CODE>. Valid for ${ttlMinutes} minute(s).`
    : purpose === OTP_PURPOSES.TRANSACTION_PIN_RESET
      ? `Your Pingload transaction PIN reset code is <CODE>. Valid for ${ttlMinutes} minute(s).`
      : purpose === OTP_PURPOSES.LOGIN_PIN_RESET
        ? `Your Pingload login PIN reset code is <CODE>. Valid for ${ttlMinutes} minute(s).`
        : `Your Pingload verification code is <CODE>. Valid for ${ttlMinutes} minute(s).`;

  logOtp('generate', {
    purpose,
    channel: 'email',
    destination: normalizeEmail(email),
    codeLength: otp.length,
  });

  if (termii.emailConfigurationId) {
    await axios.post(`${termii.baseUrl}/email/otp/send`, {
      api_key: termii.apiKey,
      email_address: normalizeEmail(email),
      code: otp,
      email_configuration_id: termii.emailConfigurationId,
    });
    logOtp('email_sent', { destination: normalizeEmail(email), purpose });
  } else {
    if (process.env.NODE_ENV === 'production') {
      const error = new Error('Email OTP is not configured. Please contact support.');
      error.statusCode = 503;
      throw error;
    }
    console.warn('[Termii] TERMII_EMAIL_CONFIGURATION_ID not set — OTP logged for email delivery fallback');
    console.log(`[EMAIL OTP] ${normalizeEmail(email)} code=${otp} (${messageText.replace('<CODE>', otp)})`);
  }

  return {
    code: otp,
    message: 'OTP sent to your email address',
    channel: 'email',
  };
};

/**
 * Send OTP for registration, password reset, or PIN reset.
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
  const smsRequested = termii.otpChannel === 'sms' && Boolean(phone);

  if (smsRequested) {
    try {
      const smsResult = await sendSmsOtp(phone, purpose);
      await saveOtpChallenge(key, {
        pinId: smsResult.pinId,
        channel: 'sms',
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

      if (!email) {
        if (process.env.NODE_ENV === 'development') return sendDevOtp(email, phone, purpose);
        const err = new Error(upstreamMessage(smsError, 'Failed to send OTP via SMS'));
        err.statusCode = 502;
        throw err;
      }
    }
  }

  try {
    const emailResult = await sendEmailOtp(email, purpose);
    await saveOtpChallenge(key, {
      code: emailResult.code,
      channel: 'email',
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
 * On success, leaves a verified=true marker (do not delete) for register/reset.
 */
const verifyOTP = async ({ email, phone, code, purpose = OTP_PURPOSES.REGISTRATION }) => {
  if (!Object.values(OTP_PURPOSES).includes(purpose)) {
    return { success: false, message: 'Invalid OTP purpose' };
  }

  const key = storeKey(email, phone, purpose);
  const normalizedCode = normalizeOtpCode(code);
  const now = new Date();

  logOtp('verify_start', {
    key,
    purpose,
    codeLength: normalizedCode.length,
    developmentMode,
  });

  // Idempotent: already verified within the post-verify window (e.g. client retry).
  const alreadyVerified = await OtpChallenge.findOne({
    key,
    verified: true,
    expiresAt: { $gt: now },
  }).select('_id expiresAt').lean();
  if (alreadyVerified) {
    logOtp('verify_already_verified', {
      key,
      id: String(alreadyVerified._id),
      expiresAt: new Date(alreadyVerified.expiresAt).toISOString(),
    });
    return { success: true, message: 'OTP already verified' };
  }

  const stored = await OtpChallenge.findOne({ key, verified: false });

  if (!stored) {
    logOtp('verify_not_found', { key, purpose });
    return { success: false, message: 'OTP expired or not found. Request a new one.' };
  }

  logOtp('verify_lookup', {
    key,
    id: String(stored._id),
    channel: stored.channel,
    attempts: stored.attempts,
    expiresAt: stored.expiresAt ? new Date(stored.expiresAt).toISOString() : null,
    now: now.toISOString(),
  });

  if (stored.expiresAt <= now) {
    logOtp('verify_expired', { key, id: String(stored._id) });
    await OtpChallenge.deleteOne({ _id: stored._id });
    return { success: false, message: 'OTP has expired. Request a new one.' };
  }

  if (stored.attempts >= MAX_ATTEMPTS) {
    logOtp('verify_max_attempts', { key, id: String(stored._id), attempts: stored.attempts });
    await OtpChallenge.deleteOne({ _id: stored._id });
    return { success: false, message: 'Too many attempts. Request a new OTP.' };
  }

  try {
    let valid = false;

    if ((stored.channel === 'sms' || stored.channel === 'dev') && stored.pinId && !stored.code) {
      valid = await verifySmsOtp(stored, normalizedCode);
    } else if (stored.code) {
      valid = stored.code === normalizedCode;
    } else if (stored.channel === 'sms' && stored.pinId) {
      valid = await verifySmsOtp(stored, normalizedCode);
    }

    if (!valid) {
      stored.attempts += 1;
      await stored.save();
      logOtp('verify_invalid_code', { key, attempts: stored.attempts });
      return { success: false, message: 'Invalid OTP code' };
    }

    // Keep the verified marker; clearing it here broke registration after a valid OTP.
    await markVerified(email, phone, purpose);
    logOtp('verify_success', { key, purpose });
    return { success: true, message: 'OTP verified successfully' };
  } catch (error) {
    stored.attempts += 1;
    await stored.save();
    logOtp('verify_error', { key, message: error.message });
    const message = error.response?.data?.message || 'OTP verification failed';
    return { success: false, message };
  }
};

const isEmailOtpVerified = async (email, purpose = OTP_PURPOSES.REGISTRATION) =>
  isVerified(email, null, purpose);

const clearEmailVerification = async (email, purpose = OTP_PURPOSES.REGISTRATION) =>
  clearVerification(email, null, purpose);

const sendSecurityAlertEmail = async (email, subject, body) => {
  if (!email) return { sent: false, reason: 'no_email' };
  const normalized = normalizeEmail(email);
  if (termii.emailConfigurationId && termii.apiKey && !developmentMode) {
    try {
      await axios.post(`${termii.baseUrl}/email/send`, {
        api_key: termii.apiKey,
        email: normalized,
        subject,
        message: body,
        email_configuration_id: termii.emailConfigurationId,
      });
      return { sent: true };
    } catch (error) {
      logApiFailure('termii:security-email', error, { email: normalized });
    }
  }
  if (process.env.NODE_ENV !== 'production') {
    console.log(`[SECURITY EMAIL] ${normalized}: ${subject} — ${body}`);
  }
  return { sent: false, reason: 'email_not_configured' };
};

module.exports = {
  OTP_PURPOSES,
  sendOTP,
  verifyOTP,
  isEmailOtpVerified,
  clearEmailVerification,
  isVerified,
  sendSecurityAlertEmail,
  OTP_EXPIRY_MS,
};
