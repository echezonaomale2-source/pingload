import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import {
  providerLogoService,
  buildLogoMap,
  mergeProvidersWithLogos,
} from '../services/providerLogoService';

export const useProviderLogos = () => {
  const [logoMap, setLogoMap] = useState({});
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await providerLogoService.fetchLogos();
      const logos = res.data?.data || [];
      const map = buildLogoMap(logos);
      setLogoMap(map);
      await providerLogoService.setCachedLogos({ logos, map, fetchedAt: Date.now() });
    } catch {
      const cached = await providerLogoService.getCachedLogos();
      if (cached?.map) setLogoMap(cached.map);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    providerLogoService.getCachedLogos().then((cached) => {
      if (cached?.map) {
        setLogoMap(cached.map);
        setLoading(false);
      }
    });
    refresh();
  }, [refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const withLogos = useCallback(
    (providers) => mergeProvidersWithLogos(providers, logoMap),
    [logoMap]
  );

  return { logoMap, loading, refresh, withLogos };
};
