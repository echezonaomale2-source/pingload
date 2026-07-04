import { X } from 'lucide-react';
import PingloadLogo from './modals/PingloadLogo';

const Modal = ({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  branded = true,
  scrollBody = false,
  compact = false,
}) => {
  if (!open) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  const bodyPadding = compact ? 'px-5 py-3' : 'px-6 py-5';
  const headerPadding = compact ? 'px-5 py-3' : 'px-6 py-4';
  const maxHeightClass = scrollBody ? 'max-h-[min(62vh,560px)] sm:max-h-[min(58vh,520px)]' : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className={`relative flex w-full flex-col ${sizes[size]} ${maxHeightClass} animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 rounded-[20px] bg-white shadow-2xl dark:bg-slate-800`}
      >
        {branded && (
          <div className={`flex shrink-0 justify-center border-b border-slate-100 dark:border-slate-700 ${compact ? 'px-5 pb-3 pt-4' : 'px-6 pb-4 pt-6'}`}>
            <PingloadLogo size={compact ? 36 : 44} />
          </div>
        )}
        <div className={`flex shrink-0 items-center justify-between border-b border-slate-100 dark:border-slate-700 ${headerPadding} ${branded ? '' : 'rounded-t-[20px]'}`}>
          <h3 className={`font-bold text-slate-900 dark:text-slate-100 ${compact ? 'text-base' : 'text-lg'}`}>{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300">
            <X size={20} />
          </button>
        </div>
        <div className={`min-h-0 flex-1 overflow-y-auto ${bodyPadding}`}>
          {children}
        </div>
        {footer ? (
          <div className={`shrink-0 border-t border-slate-100 dark:border-slate-700 ${compact ? 'px-5 py-3' : 'px-6 py-4'}`}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Modal;
