import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { PageHeader, SearchBar, DataTable, Badge, PageLoader, ErrorAlert } from '../components';
import { usersApi, getErrorMessage } from '../services/adminService';
import { formatCurrency, formatDate } from '../utils/formatters';

const UsersPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = useCallback(() => {
    setLoading(true);
    usersApi.list({ search, page, limit: 8 })
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

  if (error) return <ErrorAlert message={error} />;

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle={`${total} registered users`}
        action={
          <button type="button" className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-primary/20 hover:bg-primary-dark">
            <UserPlus size={18} /> Export Users
          </button>
        }
      />

      <div className="mb-4">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by name, email, or phone..." className="max-w-md" />
      </div>

      {loading ? <PageLoader /> : (
        <DataTable columns={columns} data={users} page={page} onPageChange={setPage} onRowClick={(row) => navigate(`/users/${row.id}`)} />
      )}
    </div>
  );
};

export default UsersPage;
