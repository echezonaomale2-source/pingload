import axios from 'axios';
import { getLoadingMessage } from '../utils/loadingMessages';
import { showGlobalLoader, hideGlobalLoader } from '../utils/loadingService';

const PRODUCTION_API_URL = 'https://pingload.top/api';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL
    || (import.meta.env.PROD ? PRODUCTION_API_URL : 'http://localhost:5003/api'),
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

const shouldShowGlobalLoader = (config) => {
  if (config?.skipGlobalLoader) return false;
  if (config?.showGlobalLoader) return true;
  const method = (config?.method || 'get').toLowerCase();
  return ['post', 'put', 'patch', 'delete'].includes(method);
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pingload_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  if (shouldShowGlobalLoader(config)) {
    const message = config.loadingMessage || getLoadingMessage(config.url || '', config.method);
    showGlobalLoader(message);
  }

  return config;
});

api.interceptors.response.use(
  (res) => {
    if (shouldShowGlobalLoader(res.config)) hideGlobalLoader();
    return res;
  },
  (error) => {
    if (error.config && shouldShowGlobalLoader(error.config)) hideGlobalLoader();
    if (error.response?.status === 401 && !error.config?.skipAuthLogout) {
      localStorage.removeItem('pingload_admin_token');
      localStorage.removeItem('pingload_admin_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
