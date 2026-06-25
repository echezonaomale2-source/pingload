import { useModal } from '../context/ModalContext';
import { useToast } from '../context/ToastContext';

/** Convenience hook combining modals + toasts for common dialog patterns */
export const useDialog = () => {
  const modal = useModal();
  const toast = useToast();

  return {
    ...modal,
    ...toast,
    /** Quick success toast */
    notifySuccess: (message, title) => toast.success(message, { title }),
    /** Quick error toast */
    notifyError: (message, title) => toast.error(message, { title }),
    /** Success modal with optional navigation on close */
    alertSuccess: (title, message, onClose) => modal.showSuccess({ title, message, onClose }),
    /** Error modal */
    alertError: (title, message, onClose) => modal.showError({ title, message, onClose }),
    /** Promise-based confirm */
    confirm: (opts) => modal.showConfirm(opts),
  };
};

export default useDialog;
