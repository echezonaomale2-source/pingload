import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import ToastItem from '../components/toast/ToastItem';

const ToastContext = createContext(null);
let toastId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback((type, message, options = {}) => {
    const id = ++toastId;
    setToasts((prev) => [...prev.slice(-2), { id, type, message, title: options.title, duration: options.duration }]);
    return id;
  }, []);

  const value = useMemo(() => ({
    success: (message, opts) => show('success', message, opts),
    error: (message, opts) => show('error', message, opts),
    warning: (message, opts) => show('warning', message, opts),
    info: (message, opts) => show('info', message, opts),
    dismiss,
  }), [show, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View style={styles.container} pointerEvents="box-none">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </View>
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, zIndex: 9998 },
});

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};

export default ToastContext;
