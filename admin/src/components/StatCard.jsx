const StatCard = ({ title, value, icon: Icon, trend, color = 'primary' }) => {
  const colors = {
    primary: 'bg-primary/10 text-primary',
    secondary: 'bg-secondary/10 text-secondary',
    success: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
    danger: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
    purple: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400',
  };

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700/80 dark:bg-slate-800">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{value}</p>
          {trend && (
            <p className={`mt-1 text-xs font-semibold ${trend.positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
              {trend.positive ? '↑' : '↓'} {trend.value} vs last month
            </p>
          )}
        </div>
        {Icon && (
          <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colors[color]}`}>
            <Icon size={22} />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
