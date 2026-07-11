import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const LOGIN_PIN_HASH_KEY = 'login_pin_hash';
const LOGIN_PIN_SALT_KEY = 'login_pin_salt';
const LOGIN_PIN_LENGTH_KEY = 'login_pin_length';

const hashPin = async (pin, salt) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);

const createSalt = async () => {
  try {
    if (typeof Crypto.randomUUID === 'function') {
      return Crypto.randomUUID();
    }
  } catch {
    // fall through
  }
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

export const hasLoginPin = async () => {
  const hash = await SecureStore.getItemAsync(LOGIN_PIN_HASH_KEY);
  return Boolean(hash);
};

export const getLoginPinLength = async () => {
  const length = await SecureStore.getItemAsync(LOGIN_PIN_LENGTH_KEY);
  return length ? parseInt(length, 10) : 4;
};

export const setLoginPin = async (pin) => {
  const normalized = String(pin || '').trim();
  if (!/^\d{4,6}$/.test(normalized)) {
    throw new Error('Login PIN must be 4–6 digits');
  }
  const salt = await createSalt();
  const hash = await hashPin(normalized, salt);
  await SecureStore.setItemAsync(LOGIN_PIN_HASH_KEY, hash);
  await SecureStore.setItemAsync(LOGIN_PIN_SALT_KEY, salt);
  await SecureStore.setItemAsync(LOGIN_PIN_LENGTH_KEY, String(normalized.length));
};

export const verifyLoginPin = async (pin) => {
  const [hash, salt] = await Promise.all([
    SecureStore.getItemAsync(LOGIN_PIN_HASH_KEY),
    SecureStore.getItemAsync(LOGIN_PIN_SALT_KEY),
  ]);
  if (!hash || !salt) return false;
  const attempt = await hashPin(String(pin || '').trim(), salt);
  return attempt === hash;
};

export const clearLoginPin = async () => {
  await SecureStore.deleteItemAsync(LOGIN_PIN_HASH_KEY);
  await SecureStore.deleteItemAsync(LOGIN_PIN_SALT_KEY);
  await SecureStore.deleteItemAsync(LOGIN_PIN_LENGTH_KEY);
};
