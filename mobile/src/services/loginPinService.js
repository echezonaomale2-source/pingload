import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

const LOGIN_PIN_HASH_KEY = 'login_pin_hash';
const LOGIN_PIN_SALT_KEY = 'login_pin_salt';
const LOGIN_PIN_LENGTH_KEY = 'login_pin_length';

const hashPin = async (pin, salt) =>
  Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, `${salt}:${pin}`);

export const hasLoginPin = async () => {
  const hash = await SecureStore.getItemAsync(LOGIN_PIN_HASH_KEY);
  return Boolean(hash);
};

export const getLoginPinLength = async () => {
  const length = await SecureStore.getItemAsync(LOGIN_PIN_LENGTH_KEY);
  return length ? parseInt(length, 10) : 4;
};

export const setLoginPin = async (pin) => {
  const salt = Crypto.randomUUID();
  const hash = await hashPin(pin, salt);
  await SecureStore.setItemAsync(LOGIN_PIN_HASH_KEY, hash);
  await SecureStore.setItemAsync(LOGIN_PIN_SALT_KEY, salt);
  await SecureStore.setItemAsync(LOGIN_PIN_LENGTH_KEY, String(pin.length));
};

export const verifyLoginPin = async (pin) => {
  const [hash, salt] = await Promise.all([
    SecureStore.getItemAsync(LOGIN_PIN_HASH_KEY),
    SecureStore.getItemAsync(LOGIN_PIN_SALT_KEY),
  ]);
  if (!hash || !salt) return false;
  const attempt = await hashPin(pin, salt);
  return attempt === hash;
};

export const clearLoginPin = async () => {
  await SecureStore.deleteItemAsync(LOGIN_PIN_HASH_KEY);
  await SecureStore.deleteItemAsync(LOGIN_PIN_SALT_KEY);
  await SecureStore.deleteItemAsync(LOGIN_PIN_LENGTH_KEY);
};
