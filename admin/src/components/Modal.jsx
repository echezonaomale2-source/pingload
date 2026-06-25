import { X } from 'lucide-react';
import PingloadLogo from './modals/PingloadLogo';

const Modal = ({ open, onClose, title, children, size = 'md', branded = true }) => {
  if (!open) return null;

  const sizes = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full ${sizes[size]} animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 rounded-[20px] bg-white shadow-2xl dark:bg-slate-800`}>
        {branded && (
          <div className="flex justify-center border-b border-slate-100 px-6 pb-4 pt-6 dark:border-slate-700">
            <PingloadLogo size={44} />
          </div>
        )}
        <div className={`flex items-center justify-between border-b border-slate-100 px-6 py-4 dark:border-slate-700 ${branded ? '' : 'rounded-t-[20px]'}`}>
          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-300">
            <X size={20} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
