import { useState, useEffect, useCallback } from 'react';
import { settingsApi, providersApi } from '../services/adminService';

const providerLabel = (name) => (name === 'vtpass' ? 'VTpass' : 'Clubkonnect');

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

  const activeProviders = providers.filter((p) => p.enabled && p.configured).map((p) => p.providerId);
  const selected = status?.preferred || status?.active || 'clubkonnect';
  const label = providerLabel(selected);
  const otherLabel = providerLabel(selected === 'vtpass' ? 'clubkonnect' : 'vtpass');
  const showBoth = activeProviders.length > 1;

  const codeLabelForProvider = (providerId) => (
    providerId === 'vtpass' ? 'Variation Code' : 'Plan Code'
  );

  return {
    status,
    providers,
    activeProviders,
    serviceRouting,
    loading,
    selected,
    active: status?.active || selected,
    label,
    otherLabel,
    showBoth,
    usingFallback: Boolean(status?.usingFallback),
    serviceIdLabel: `${label} service ID`,
    variationCodeLabel: codeLabelForProvider(selected),
    codeLabelForProvider,
    refresh,
  };
};

export default useVtuProvider;
