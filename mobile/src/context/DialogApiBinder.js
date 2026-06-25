import { useEffect } from 'react';
import { bindDialogApi } from '../utils/dialog';
import { useModal } from './ModalContext';
import { useToast } from './ToastContext';

/** Binds modal + toast APIs for use outside React components (e.g. pickAvatar.js) */
export const DialogApiBinder = () => {
  const modal = useModal();
  const toast = useToast();

  useEffect(() => {
    bindDialogApi({
      ...modal,
      toastSuccess: toast.success,
      toastError: toast.error,
      toastInfo: toast.info,
      toastWarning: toast.warning,
    });
  }, [modal, toast]);

  return null;
};

export default DialogApiBinder;
