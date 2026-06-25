const Badge = ({ children, status }) => {
  const styles = {
    active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    suspended: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    successful: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    resolved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    closed: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    sent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    verified: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    unverified: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    low: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300',
    credit: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    debit: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    refunded: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  };

  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${styles[status] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
      {children}
    </span>
  );
};

export default Badge;
