import { useState, useEffect, useCallback } from 'react';
import { settingsApi, providersApi } from '../services/adminService';

export const useVtuProvider = () => {
  const [status, setStatus] = useState(null);
  const [providers, setProviders] = useState([]);
  const [serviceRouting, setServiceRouting] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [settingsRes, providersRes] = await Promise.all([
        settingsApi.get(),
        providersApi.get(),
      ]);
      setStatus(settingsRes.data.data?.providerStatus || null);
      setProviders(providersRes.data.data?.providers || []);
      setServiceRouting(providersRes.data.data?.serviceRouting || settingsRes.data.data?.serviceRouting || null);
      return settingsRes.data.data?.providerStatus || null;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
    const onFocus = () => { refresh().catch(() => {}); };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [refresh]);

  return {
    status,
    providers,
    activeProviders: ['vtpass'],
    serviceRouting,
    loading,
    selected: 'vtpass',
    active: 'vtpass',
    label: 'VTpass',
    serviceIdLabel: 'VTpass service ID',
    variationCodeLabel: 'Variation Code',
    refresh,
  };
};

export default useVtuProvider;
