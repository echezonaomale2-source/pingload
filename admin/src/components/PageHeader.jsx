const PageHeader = ({ title, subtitle, action }) => (
  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);

export default PageHeader;
