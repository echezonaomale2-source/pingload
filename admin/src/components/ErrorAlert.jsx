const ErrorAlert = ({ message }) => (
  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400">
    {message}
  </div>
);

export default ErrorAlert;
