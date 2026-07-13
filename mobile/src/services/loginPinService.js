import * as SecureStore from 'expo-secure-store';

/**
 * Device-side helpers for Login PIN UX (digit length cache only).
 * The canonical Login PIN is bcrypt-hashed on the account in MongoDB.
 * Local hashes are never used as the source of truth across devices/reinstalls.
 */
const LOGIN_PIN_LENGTH_KEY = 'login_pin_length';

/** @deprecated kept for logout cleanup of older installs */
const LEGACY_HASH_KEY = 'login_pin_hash';
const LEGACY_SALT_KEY = 'login_pin_salt';

export const cacheLoginPinLength = async (length) => {
  const n = Number(length);
  if (n === 4 || n === 6) {
    await SecureStore.setItemAsync(LOGIN_PIN_LENGTH_KEY, String(n));
  }
};

export const getLoginPinLength = async () => {
  const length = await SecureStore.getItemAsync(LOGIN_PIN_LENGTH_KEY);
  return length ? parseInt(length, 10) : 4;
};

/** Mirror digit length after a successful server setup/change (not the PIN secret). */
export const setLoginPin = async (pin) => {
  const normalized = String(pin || '').trim();
  if (!/^\d{4,6}$/.test(normalized)) {
    throw new Error('Login PIN must be 4–6 digits');
  }
  await cacheLoginPinLength(normalized.length);
};

export const clearLoginPin = async () => {
  await SecureStore.deleteItemAsync(LOGIN_PIN_LENGTH_KEY);
  await SecureStore.deleteItemAsync(LEGACY_HASH_KEY);
  await SecureStore.deleteItemAsync(LEGACY_SALT_KEY);
};
