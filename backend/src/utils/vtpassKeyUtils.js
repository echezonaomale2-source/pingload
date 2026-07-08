const crypto = require('crypto');

/** Strip whitespace and surrounding quotes from Render/env values. */
const normalizeEnvValue = (value) => {
  if (value == null) return '';
  let text = String(value).trim();
  if (
    (text.startsWith('"') && text.endsWith('"'))
    || (text.startsWith("'") && text.endsWith("'"))
  ) {
    text = text.slice(1, -1).trim();
  }
  return text.replace(/\r/g, '');
};

const keyFingerprint = (value) => {
  if (!value) return null;
  return crypto.createHash('sha256').update(value).digest('hex').slice(0, 12);
};

const keyHint = (value, expectedPrefix) => ({
  set: Boolean(value),
  length: value ? value.length : 0,
  prefixOk: expectedPrefix ? value?.startsWith(expectedPrefix) : true,
  fingerprint: keyFingerprint(value),
});

const getVtpassKeyDiagnostics = (vtpass = {}) => ({
  apiKey: keyHint(vtpass.apiKey),
  publicKey: keyHint(vtpass.publicKey, 'PK_'),
  secretKey: keyHint(vtpass.secretKey, 'SK_'),
  baseUrl: vtpass.baseUrl || null,
  mode: vtpass.mode || null,
});

const validateVtpassKeyFormats = (vtpass = {}) => {
  const issues = [];
  if (!vtpass.apiKey) issues.push('VTPASS_API_KEY is missing');
  else if (vtpass.apiKey.length < 16) issues.push('VTPASS_API_KEY looks truncated (too short)');
  if (!vtpass.publicKey) issues.push('VTPASS_PUBLIC_KEY is missing');
  else if (!vtpass.publicKey.startsWith('PK_')) issues.push('VTPASS_PUBLIC_KEY must start with PK_');
  if (!vtpass.secretKey) issues.push('VTPASS_SECRET_KEY is missing');
  else if (!vtpass.secretKey.startsWith('SK_')) issues.push('VTPASS_SECRET_KEY must start with SK_');
  return { valid: issues.length === 0, issues };
};

module.exports = {
  normalizeEnvValue,
  keyFingerprint,
  keyHint,
  getVtpassKeyDiagnostics,
  validateVtpassKeyFormats,
};
