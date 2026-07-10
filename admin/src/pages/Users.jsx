import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { PageHeader, SearchBar, DataTable, Badge, PageLoader, ErrorAlert } from '../components';
import { usersApi, getErrorMessage } from '../services/adminService';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useDialog } from '../hooks/useDialog';

const PAGE_SIZE = 8;
const EXPORT_PAGE_SIZE = 100;

const UsersPage = () => {
  const navigate = useNavigate();
  const dialog = useDialog();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);
  const exportAbortRef = useRef(false);

  const fetchUsers = useCallback(() => {
    setLoading(true);
    setError('');
    usersApi.list({ search, page, limit: PAGE_SIZE })
      .then((res) => {
        setUsers(res.data.data);
        setTotal(res.data.pagination?.total || 0);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [search, page]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const columns = [
    { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs">{String(r.id).slice(-6)}</span> },
    { key: 'fullName', label: 'Name', render: (r) => <span className="font-semibold text-slate-800">{r.fullName}</span> },
    { key: 'email', label: 'Email' },
    { key: 'phone', label: 'Phone' },
    { key: 'walletBalance', label: 'Balance', render: (r) => formatCurrency(r.walletBalance) },
    { key: 'status', label: 'Status', render: (r) => <Badge status={r.status}>{r.status}</Badge> },
    { key: 'kycStatus', label: 'KYC', render: (r) => <Badge status={r.kycStatus}>{r.kycStatus}</Badge> },
    { key: 'joinedAt', label: 'Joined', render: (r) => formatDate(r.joinedAt) },
  ];

  const handleExport = async () => {
    setExporting(true);
    exportAbortRef.current = false;
    try {
      const allRows = [];
      let currentPage = 1;
      let totalPages = 1;

      do {
        const res = await usersApi.list({ search, page: currentPage, limit: EXPORT_PAGE_SIZE });
        const rows = res.data.data || [];
        allRows.push(...rows);
        totalPages = res.data.pagination?.pages
          || Math.ceil((res.data.pagination?.total || rows.length) / EXPORT_PAGE_SIZE)
          || 1;
        currentPage += 1;
      } while (currentPage <= totalPages && !exportAbortRef.current);

      const header = 'ID,Name,Email,Phone,Balance,Status,KYC,Joined\n';
      const csv = header + allRows.map((r) => [
        r.id,
        `"${(r.fullName || '').replace(/"/g, '""')}"`,
        r.email,
        r.phone,
        r.walletBalance,
        r.status,
        r.kycStatus,
        r.joinedAt,
      ].join(',')).join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pingload-users-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      dialog.notifySuccess(`Exported ${allRows.length} user(s)`);
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    } finally {
      setExporting(false);
    }
  };

  if (error) {
    return (
      <div>
        <ErrorAlert message={error} />
        <button
          type="button"
          onClick={fetchUsers}
          className="mt-4 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle={`${total} registered users`}
        action={
          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-dark disabled:opacity-60"
          >
            <UserPlus size={18} /> {exporting ? 'Exporting...' : 'Export Users'}
          </button>
        }
      />

      <div className="mb-4">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by name, email, or phone..." className="max-w-md" />
      </div>

      {loading ? <PageLoader /> : (
        <DataTable
          columns={columns}
          data={users}
          page={page}
          pageSize={PAGE_SIZE}
          totalPages={Math.ceil(total / PAGE_SIZE)}
          serverPaginated
          onPageChange={setPage}
          onRowClick={(row) => navigate(`/users/${row.id}`)}
        />
      )}
    </div>
  );
};

export default UsersPage;
