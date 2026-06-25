let _api = null;

export const bindDialogApi = (api) => {
  _api = api;
};

export const dialog = {
  success: (title, message, onClose) => _api?.showSuccess({ title, message, onClose }),
  error: (title, message, onClose) => _api?.showError({ title, message, onClose }),
  warning: (opts) => _api?.showWarning(opts),
  confirm: (opts) => _api?.showConfirm(opts),
  actionSheet: (opts) => _api?.showActionSheet(opts),
  loading: (msg) => _api?.showLoading(msg),
  hideLoading: () => _api?.hideLoading(),
  toast: {
    success: (msg, opts) => _api?.toastSuccess?.(msg, opts),
    error: (msg, opts) => _api?.toastError?.(msg, opts),
    info: (msg, opts) => _api?.toastInfo?.(msg, opts),
    warning: (msg, opts) => _api?.toastWarning?.(msg, opts),
  },
};
