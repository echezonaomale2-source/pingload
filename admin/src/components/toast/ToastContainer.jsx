import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react';

const ICONS = {
  success: { Icon: CheckCircle, bar: 'bg-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/30', color: 'text-emerald-600 dark:text-emerald-400' },
  error: { Icon: XCircle, bar: 'bg-red-500', bg: 'bg-red-50 dark:bg-red-900/30', color: 'text-red-600 dark:text-red-400' },
  warning: { Icon: AlertTriangle, bar: 'bg-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/30', color: 'text-amber-600 dark:text-amber-400' },
  info: { Icon: Info, bar: 'bg-primary', bg: 'bg-primary/10', color: 'text-primary' },
};

const ToastItem = ({ toast, onDismiss }) => {
  const [visible, setVisible] = useState(false);
  const { Icon, bar, bg, color } = ICONS[toast.type] || ICONS.info;

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 250);
    }, toast.duration || 3500);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      className={`pointer-events-auto flex w-full max-w-md items-center gap-3 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-xl transition-all duration-300 dark:border-slate-700/80 dark:bg-slate-800 ${
        visible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'
      }`}
    >
      <div className={`w-1 self-stretch rounded-full ${bar}`} />
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${bg}`}>
        <Icon size={20} className={color} />
      </div>
      <div className="min-w-0 flex-1">
        {toast.title && <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{toast.title}</p>}
        <p className="text-sm text-slate-500 dark:text-slate-400">{toast.message}</p>
      </div>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-black text-white">P</div>
    </div>
  );
};

export const ToastContainer = ({ toasts, onDismiss }) => (
  <div className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex flex-col items-center gap-2 px-4">
    {toasts.map((t) => (
      <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
    ))}
  </div>
);
