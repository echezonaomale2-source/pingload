import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../utils/constants';
import { getLoadingMessage } from '../utils/loadingMessages';
import { showGlobalLoader, hideGlobalLoader } from '../utils/loadingService';
import { isOnline } from '../utils/networkStatus';
import { emitAppLocked, emitSessionExpired } from '../utils/appLockEvents';

const REQUEST_TIMEOUT_MS = 15000;
const TOKEN_KEY = 'token';

/**
 * In-memory session token mirrors SecureStore.
 * Avoids SecureStore read races right after login and makes 401 scoping reliable.
 */
let memoryToken = null;
let sessionEpoch = 0;

export const getSessionToken = () => memoryToken;

export const setSessionToken = async (token) => {
  memoryToken = token || null;
  sessionEpoch += 1;
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
  }
  return sessionEpoch;
};

export const clearSessionToken = async () => {
  memoryToken = null;
  sessionEpoch += 1;
  await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
  return sessionEpoch;
};

export const hydrateSessionToken = async () => {
  const token = await SecureStore.getItemAsync(TOKEN_KEY);
  memoryToken = token || null;
  return memoryToken;
};

export const getSessionEpoch = () => sessionEpoch;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

const shouldShowGlobalLoader = (config) => {
  if (config?.skipGlobalLoader) return false;
  if (config?.showGlobalLoader) return true;
  const method = (config?.method || 'get').toLowerCase();
  return ['post', 'put', 'patch', 'delete'].includes(method);
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readHeader = (headers, name) => {
  if (!headers) return null;
  if (typeof headers.get === 'function') {
    return headers.get(name) || headers.get(name.toLowerCase()) || null;
  }
  return headers[name] || headers[name.toLowerCase()] || headers.common?.[name] || null;
};

const bearerFromHeader = (header) => {
  if (!header || typeof header !== 'string') return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
};

api.interceptors.request.use(async (config) => {
  const online = await isOnline();
  if (!online) {
    const error = new Error('No internet connection. Please check your network and try again.');
    error.code = 'OFFLINE';
    return Promise.reject(error);
  }

  let token = memoryToken;
  if (!token) {
    token = await SecureStore.getItemAsync(TOKEN_KEY);
    memoryToken = token || null;
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (config.headers) {
    if (typeof config.headers.delete === 'function') {
      config.headers.delete('Authorization');
    } else {
      delete config.headers.Authorization;
    }
  }

  // Stamp the request with the session epoch + bearer used so late 401s can be scoped.
  config.__sessionEpoch = sessionEpoch;
  config.__requestToken = token || null;

  if (__DEV__) {
    const method = (config.method || 'get').toUpperCase();
    const path = config.url || '';
    console.log(`[API] → ${method} ${path}`, token ? '(auth)' : '(no token)');
  }

  if (shouldShowGlobalLoader(config)) {
    const message = config.loadingMessage || getLoadingMessage(config.url || '', config.method);
    showGlobalLoader(message);
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      const method = (response.config?.method || 'get').toUpperCase();
      console.log(`[API] ← ${response.status} ${method} ${response.config?.url || ''}`);
    }
    if (shouldShowGlobalLoader(response.config)) {
      hideGlobalLoader();
    }
    return response;
  },
  async (error) => {
    const config = error.config;
    if (__DEV__) {
      const method = (config?.method || 'get').toUpperCase();
      const status = error.response?.status ?? error.code ?? 'ERR';
      console.warn(`[API] ✗ ${status} ${method} ${config?.url || ''}`, error.response?.data?.message || error.message);
    }
    if (config && shouldShowGlobalLoader(config)) {
      hideGlobalLoader();
    }

    if (!error.response && config && !config.__retryCount) {
      const online = await isOnline();
      if (online && (error.code === 'ECONNABORTED' || error.message?.includes('Network'))) {
        config.__retryCount = 1;
        await sleep(800);
        return api(config);
      }
    }

    const status = error.response?.status;
    const code = error.response?.data?.code;
    const message = (error.response?.data?.message || '').toLowerCase();

    if (status === 403 && code === 'APP_LOCKED' && !config?.skipAuthLogout) {
      emitAppLocked();
      return Promise.reject(error);
    }

    if (status === 401 && !config?.skipAuthLogout) {
      const isPinError = /transaction pin|incorrect pin|current pin/.test(message);
      const isAuthFailure = /not authorized|token invalid|session expired|invalid token|user not found|user access required/i.test(message);

      if (!isPinError && isAuthFailure) {
        const failedToken = config?.__requestToken
          || bearerFromHeader(readHeader(config?.headers, 'Authorization'));
        const currentToken = memoryToken || await SecureStore.getItemAsync(TOKEN_KEY);
        const sameEpoch = config?.__sessionEpoch == null || config.__sessionEpoch === sessionEpoch;

        // ONLY clear the active session when this 401 is for the CURRENT bearer.
        // Missing/unreadable Authorization must never wipe a valid logged-in session.
        if (
          sameEpoch
          && currentToken
          && failedToken
          && failedToken === currentToken
        ) {
          await clearSessionToken();
          emitSessionExpired();
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
