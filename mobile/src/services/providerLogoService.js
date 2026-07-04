import api from './api';
import * as SecureStore from 'expo-secure-store';

const CACHE_KEY = 'pingload_provider_logos_v1';

export const providerLogoService = {
  fetchLogos: () => api.get('/services/provider-logos', { skipGlobalLoader: true }),

  getCachedLogos: async () => {
    try {
      const raw = await SecureStore.getItemAsync(CACHE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  setCachedLogos: async (payload) => {
    try {
      await SecureStore.setItemAsync(CACHE_KEY, JSON.stringify(payload));
    } catch {
      // Cache is best-effort.
    }
  },

  clearCache: () => SecureStore.deleteItemAsync(CACHE_KEY),
};

export const buildLogoMap = (logos = []) => {
  const map = {};
  for (const item of logos) {
    if (item?.providerId && item.logoUri) {
      map[item.providerId.toLowerCase()] = item.logoUri;
    }
  }
  return map;
};

export const mergeProvidersWithLogos = (providers = [], logoMap = {}) =>
  providers.map((provider) => {
    const logoUri = logoMap[provider.id?.toLowerCase()];
    return logoUri ? { ...provider, logoUri } : provider;
  });
