import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { FullScreenLoader } from '../components/loading';
import { subscribeLoading } from '../utils/loadingService';
import { LOADING_MESSAGES } from '../utils/loadingMessages';

const LoadingContext = createContext({ visible: false });

export const LoadingProvider = ({ children }) => {
  const [state, setState] = useState({ visible: false, message: LOADING_MESSAGES.DEFAULT, slow: false });

  useEffect(() => subscribeLoading(setState), []);

  const value = useMemo(() => ({ visible: state.visible, message: state.message }), [state.visible, state.message]);

  return (
    <LoadingContext.Provider value={value}>
      {children}
      <FullScreenLoader
        visible={state.visible}
        message={state.message}
        slow={state.slow}
      />
    </LoadingContext.Provider>
  );
};

export const useGlobalLoading = () => {
  const ctx = useContext(LoadingContext);
  return ctx?.visible ?? false;
};

export default LoadingProvider;
