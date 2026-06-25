import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { ToastContainer } from '../components/toast/ToastContainer';

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
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast requires ToastProvider');
  return ctx;
};
