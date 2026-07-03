import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../utils/constants';
import { getLoadingMessage } from '../utils/loadingMessages';
import { showGlobalLoader, hideGlobalLoader } from '../utils/loadingService';
import { isOnline } from '../utils/networkStatus';

const REQUEST_TIMEOUT_MS = 15000;

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

api.interceptors.request.use(async (config) => {
  const online = await isOnline();
  if (!online) {
    const error = new Error('No internet connection. Please check your network and try again.');
    error.code = 'OFFLINE';
    return Promise.reject(error);
  }

  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

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

    if (error.response?.status === 401 && !config?.skipAuthLogout) {
      await SecureStore.deleteItemAsync('token');
    }

    return Promise.reject(error);
  }
);

export default api;
