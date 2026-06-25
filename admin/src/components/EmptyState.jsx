const EmptyState = ({ icon: Icon, title, description }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center dark:border-slate-700 dark:bg-slate-800">
    {Icon && <Icon size={40} className="mb-4 text-slate-300 dark:text-slate-600" />}
    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300">{title}</h3>
    {description && <p className="mt-1 max-w-sm text-sm text-slate-400 dark:text-slate-500">{description}</p>}
  </div>
);

export default EmptyState;
