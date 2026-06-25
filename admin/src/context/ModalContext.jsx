import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { SuccessModal, ErrorModal, WarningModal, ConfirmationModal, LoadingModal } from '../components/modals/ThemedModals';

const ModalContext = createContext(null);

export const ModalProvider = ({ children }) => {
  const [state, setState] = useState(null);
  const close = useCallback(() => setState(null), []);

  const showSuccess = useCallback((opts) => setState({ type: 'success', props: opts }), []);
  const showError = useCallback((opts) => {
    const props = typeof opts === 'string' ? { message: opts } : opts;
    setState({ type: 'error', props });
  }, []);
  const showWarning = useCallback((opts) => setState({ type: 'warning', props: opts }), []);
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
  const showLoading = useCallback((message) => setState({ type: 'loading', props: { message } }), []);
  const hideLoading = useCallback(() => setState((s) => (s?.type === 'loading' ? null : s)), []);

  const value = useMemo(() => ({
    showSuccess, showError, showWarning, showConfirm, showLoading, hideLoading, close,
  }), [showSuccess, showError, showWarning, showConfirm, showLoading, hideLoading, close]);

  const render = () => {
    if (!state) return null;
    const { type, props } = state;
    const wrapClose = (fn) => () => { close(); fn?.(); };

    switch (type) {
      case 'success':
        return <SuccessModal open title={props.title} message={props.message} buttonText={props.buttonText} onClose={wrapClose(props.onClose)} />;
      case 'error':
        return <ErrorModal open title={props.title} message={props.message} buttonText={props.buttonText} onClose={wrapClose(props.onClose)} />;
      case 'warning':
        return <WarningModal open {...props} onConfirm={wrapClose(props.onConfirm)} onClose={wrapClose(props.onCancel)} />;
      case 'confirm':
        return <ConfirmationModal open {...props} />;
      case 'loading':
        return <LoadingModal open message={props.message} />;
      default:
        return null;
    }
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
      {render()}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error('useModal requires ModalProvider');
  return ctx;
};
