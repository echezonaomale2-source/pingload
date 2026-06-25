import Pagination from './Pagination';

const DataTable = ({ columns, data, onRowClick, page = 1, pageSize = 8, onPageChange }) => {
  const totalPages = Math.ceil(data.length / pageSize);
  const paginated = data.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700/80 dark:bg-slate-800">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/80">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-slate-400 dark:text-slate-500">
                  No records found
                </td>
              </tr>
            ) : (
              paginated.map((row, i) => (
                <tr
                  key={row.id || i}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-slate-50 transition dark:border-slate-700/50 ${onRowClick ? 'cursor-pointer hover:bg-primary/5 dark:hover:bg-primary/10' : ''}`}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3.5 text-slate-700 dark:text-slate-300">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {onPageChange && <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />}
    </div>
  );
};

export default DataTable;
