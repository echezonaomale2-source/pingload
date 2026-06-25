import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import {
  SuccessModal,
  ErrorModal,
  WarningModal,
  ConfirmationModal,
  LoadingModal,
  ActionSheetModal,
} from '../components/modals';

const ModalContext = createContext(null);

export const ModalProvider = ({ children }) => {
  const [state, setState] = useState(null);

  const close = useCallback(() => setState(null), []);

  const showSuccess = useCallback((opts) => {
    setState({ type: 'success', props: opts });
  }, []);

  const showError = useCallback((opts) => {
    setState({ type: 'error', props: typeof opts === 'string' ? { message: opts } : opts });
  }, []);

  const showWarning = useCallback((opts) => {
    setState({ type: 'warning', props: opts });
  }, []);

  const showConfirm = useCallback((opts) => new Promise((resolve) => {
    setState({
      type: 'confirm',
      props: {
        ...opts,
        onConfirm: () => { close(); resolve(true); opts.onConfirm?.(); },
        onClose: () => { close(); resolve(false); opts.onCancel?.(); },
      },
    });
  }), [close]);

  const showActionSheet = useCallback((opts) => new Promise((resolve) => {
    setState({
      type: 'action',
      props: {
        ...opts,
        options: opts.options.map((opt) => ({
          ...opt,
          onPress: () => { resolve(opt); opt.onPress?.(); },
        })),
        onClose: () => { close(); resolve(null); },
      },
    });
  }), [close]);

  const showLoading = useCallback((message) => {
    setState({ type: 'loading', props: { message } });
  }, []);

  const hideLoading = useCallback(() => {
    setState((s) => (s?.type === 'loading' ? null : s));
  }, []);

  const value = useMemo(() => ({
    showSuccess,
    showError,
    showWarning,
    showConfirm,
    showActionSheet,
    showLoading,
    hideLoading,
    close,
  }), [showSuccess, showError, showWarning, showConfirm, showActionSheet, showLoading, hideLoading, close]);

  const renderModal = () => {
    if (!state) return null;
    const { type, props } = state;

    switch (type) {
      case 'success':
        return (
          <SuccessModal
            visible
            title={props.title}
            message={props.message}
            buttonText={props.buttonText}
            onClose={() => { close(); props.onClose?.(); }}
          />
        );
      case 'error':
        return (
          <ErrorModal
            visible
            title={props.title}
            message={props.message}
            buttonText={props.buttonText}
            onClose={() => { close(); props.onClose?.(); }}
          />
        );
      case 'warning':
        return (
          <WarningModal
            visible
            title={props.title}
            message={props.message}
            confirmText={props.confirmText}
            cancelText={props.cancelText}
            onConfirm={() => { close(); props.onConfirm?.(); }}
            onClose={() => { close(); props.onCancel?.(); }}
          />
        );
      case 'confirm':
        return (
          <ConfirmationModal
            visible
            title={props.title}
            message={props.message}
            confirmText={props.confirmText}
            cancelText={props.cancelText}
            destructive={props.destructive}
            onConfirm={props.onConfirm}
            onClose={props.onClose}
          />
        );
      case 'action':
        return (
          <ActionSheetModal
            visible
            title={props.title}
            options={props.options}
            onClose={props.onClose}
          />
        );
      case 'loading':
        return <LoadingModal visible message={props.message} />;
      default:
        return null;
    }
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
      {renderModal()}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal must be used within ModalProvider');
  return ctx;
};

export default ModalContext;
