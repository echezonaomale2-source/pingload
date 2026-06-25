import { CheckCircle, XCircle, AlertTriangle, HelpCircle } from 'lucide-react';
import ModalShell, { ModalButton } from './ModalShell';
import LogoLoader from '../loading/LogoLoader';
import '../loading/LogoLoader.css';

const ICONS = {
  success: { Icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/30' },
  error: { Icon: XCircle, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/30' },
  warning: { Icon: AlertTriangle, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/30' },
  confirm: { Icon: HelpCircle, color: 'text-primary', bg: 'bg-primary/10' },
};

export const SuccessModal = ({ open, title = 'Success', message, buttonText = 'OK', onClose }) => {
  const { Icon, color, bg } = ICONS.success;
  return (
    <ModalShell open={open} onClose={onClose} title={title}>
      <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${bg}`}>
        <Icon size={44} className={color} />
      </div>
      {message && <p className="mb-2 text-center text-sm leading-relaxed text-slate-500 dark:text-slate-400">{message}</p>}
      <ModalButton variant="primary" onClick={onClose} className="mt-5 w-full flex-none">
        {buttonText}
      </ModalButton>
    </ModalShell>
  );
};

export const ErrorModal = ({ open, title = 'Error', message, buttonText = 'OK', onClose }) => {
  const { Icon, color, bg } = ICONS.error;
  return (
    <ModalShell open={open} onClose={onClose} title={title}>
      <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${bg}`}>
        <Icon size={44} className={color} />
      </div>
      {message && <p className="text-center text-sm leading-relaxed text-slate-500 dark:text-slate-400">{message}</p>}
      <ModalButton variant="primary" onClick={onClose} className="mt-5 w-full flex-none">
        {buttonText}
      </ModalButton>
    </ModalShell>
  );
};

export const WarningModal = ({ open, title = 'Warning', message, confirmText = 'Continue', cancelText = 'Cancel', onConfirm, onClose }) => {
  const { Icon, color, bg } = ICONS.warning;
  return (
    <ModalShell open={open} onClose={onClose} title={title}>
      <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${bg}`}>
        <Icon size={40} className={color} />
      </div>
      {message && <p className="text-center text-sm leading-relaxed text-slate-500 dark:text-slate-400">{message}</p>}
      <div className="mt-5 flex gap-3">
        <ModalButton variant="cancel" onClick={onClose}>{cancelText}</ModalButton>
        <ModalButton variant="secondary" onClick={onConfirm}>{confirmText}</ModalButton>
      </div>
    </ModalShell>
  );
};

export const ConfirmationModal = ({
  open, title = 'Confirm', message, confirmText = 'Confirm', cancelText = 'Cancel',
  onConfirm, onClose, destructive = false,
}) => {
  const icon = destructive ? ICONS.error : ICONS.confirm;
  const { Icon, color, bg } = icon;
  return (
    <ModalShell open={open} onClose={onClose} title={title}>
      <div className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full ${bg}`}>
        <Icon size={40} className={color} />
      </div>
      {message && <p className="text-center text-sm leading-relaxed text-slate-500 dark:text-slate-400">{message}</p>}
      <div className="mt-5 flex gap-3">
        <ModalButton variant="cancel" onClick={onClose}>{cancelText}</ModalButton>
        <ModalButton variant={destructive ? 'danger' : 'primary'} onClick={onConfirm}>{confirmText}</ModalButton>
      </div>
    </ModalShell>
  );
};

export const LoadingModal = ({ open, message = 'Please wait...' }) => (
  open ? (
    <div className="pingload-fullscreen-loader bg-white/96 dark:bg-slate-950/96">
      <div className="text-center">
        <LogoLoader size={72} />
        <p className="pingload-fullscreen-loader__message">{message}</p>
      </div>
    </div>
  ) : null
);
