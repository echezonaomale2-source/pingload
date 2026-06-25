import { useModal } from '../context/ModalContext';
import { useToast } from '../context/ToastContext';

export const useDialog = () => {
  const modal = useModal();
  const toast = useToast();

  return {
    ...modal,
    ...toast,
    notifySuccess: (message, title) => toast.success(message, { title }),
    notifyError: (message, title) => toast.error(message, { title }),
    notifyInfo: (message, title) => toast.info(message, { title }),
    alertError: (title, message) => modal.showError({ title, message }),
    alertSuccess: (title, message, onClose) => modal.showSuccess({ title, message, onClose }),
    confirm: (opts) => modal.showConfirm(opts),
  };
};

export default useDialog;
