import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, SearchBar, DataTable, Badge, PageLoader, ErrorAlert } from '../components';
import { transactionsApi, getErrorMessage } from '../services/adminService';
import { formatCurrency, formatDate, SERVICE_LABELS } from '../utils/formatters';

const SERVICES_FILTER = ['all', 'airtime', 'data', 'electricity', 'tv', 'betting', 'education', 'wallet_funding', 'admin_credit', 'admin_debit'];
const STATUS_FILTER = ['all', 'successful', 'pending', 'failed'];

const TransactionsPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [service, setService] = useState('all');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTx = useCallback(() => {
    setLoading(true);
    transactionsApi.list({ search, service, status, page, limit: 8 })
      .then((res) => setTransactions(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [search, service, status, page]);

  useEffect(() => { fetchTx(); }, [fetchTx]);

  const columns = [
    { key: 'id', label: 'Transaction ID', render: (r) => <span className="font-mono text-xs">{r.reference || String(r.id).slice(-8)}</span> },
    { key: 'userName', label: 'User', render: (r) => <span className="font-semibold">{r.userName}</span> },
    { key: 'service', label: 'Service', render: (r) => SERVICE_LABELS[r.service] || r.service },
    { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
    { key: 'status', label: 'Status', render: (r) => <Badge status={r.status}>{r.status}</Badge> },
    { key: 'createdAt', label: 'Date', render: (r) => formatDate(r.createdAt) },
  ];

  if (error) return <ErrorAlert message={error} />;

  return (
    <div>
      <PageHeader title="Transaction Management" subtitle="View and filter all platform transactions" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by ID, user, or reference..." className="max-w-md flex-1" />
        <select value={service} onChange={(e) => { setService(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-primary">
          {SERVICES_FILTER.map((s) => <option key={s} value={s}>{s === 'all' ? 'All Services' : SERVICE_LABELS[s] || s}</option>)}
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-primary">
          {STATUS_FILTER.map((s) => <option key={s} value={s}>{s === 'all' ? 'All Status' : s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      {loading ? <PageLoader /> : (
        <DataTable columns={columns} data={transactions} page={page} onPageChange={setPage} onRowClick={(row) => navigate(`/transactions/${row.id}`)} />
      )}
    </div>
  );
};

export default TransactionsPage;
