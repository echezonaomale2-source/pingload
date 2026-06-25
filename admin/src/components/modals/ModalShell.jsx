import { X } from 'lucide-react';
import PingloadLogo from './PingloadLogo';

const ModalShell = ({ open, onClose, title, children, showLogo = true, showClose = true }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 rounded-[20px] bg-white p-6 shadow-2xl dark:bg-slate-800">
        {showClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X size={20} />
          </button>
        )}
        {showLogo && (
          <div className="mb-4 flex justify-center pt-1">
            <PingloadLogo />
          </div>
        )}
        {title && <h3 className="mb-2 text-center text-xl font-extrabold text-slate-900 dark:text-slate-100">{title}</h3>}
        {children}
      </div>
    </div>
  );
};

export const ModalButton = ({ children, onClick, variant = 'primary', disabled, className = '' }) => {
  const styles = {
    primary: 'bg-primary text-white hover:bg-primary-dark shadow-md shadow-primary/20',
    secondary: 'bg-secondary text-white hover:opacity-90 shadow-md shadow-secondary/20',
    cancel: 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition disabled:opacity-60 ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

export default ModalShell;
