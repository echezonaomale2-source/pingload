import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../utils/constants';
import { getLoadingMessage } from '../utils/loadingMessages';
import { showGlobalLoader, hideGlobalLoader } from '../utils/loadingService';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

if (__DEV__) {
  console.log('[API] Base URL:', API_BASE_URL);
}

const shouldShowGlobalLoader = (config) => {
  if (config?.skipGlobalLoader) return false;
  if (config?.showGlobalLoader) return true;
  const method = (config?.method || 'get').toLowerCase();
  return ['post', 'put', 'patch', 'delete'].includes(method);
};

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (shouldShowGlobalLoader(config)) {
    const message = config.loadingMessage || getLoadingMessage(config.url || '', config.method);
    showGlobalLoader(message);
  }

  return config;
});

api.interceptors.response.use(
  (response) => {
    if (shouldShowGlobalLoader(response.config)) {
      hideGlobalLoader();
    }
    return response;
  },
  async (error) => {
    const config = error.config;
    if (config && shouldShowGlobalLoader(config)) {
      hideGlobalLoader();
    }

    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('token');
    }
    return Promise.reject(error);
  }
);

export default api;
