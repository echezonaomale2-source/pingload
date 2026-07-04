import React, { createContext, useContext, useMemo } from 'react';
import { useProviderLogos } from '../hooks/useProviderLogos';

const ProviderLogosContext = createContext(null);

export const ProviderLogosProvider = ({ children }) => {
  const value = useProviderLogos();
  const memo = useMemo(() => value, [value.logoMap, value.loading, value.withLogos, value.refresh]);
  return (
    <ProviderLogosContext.Provider value={memo}>
      {children}
    </ProviderLogosContext.Provider>
  );
};

export const useProviderLogosContext = () => {
  const ctx = useContext(ProviderLogosContext);
  if (!ctx) {
    throw new Error('useProviderLogosContext must be used within ProviderLogosProvider');
  }
  return ctx;
};

export const useProvidersWithLogos = (providers) => {
  const { withLogos } = useProviderLogosContext();
  return useMemo(() => withLogos(providers), [providers, withLogos]);
};
