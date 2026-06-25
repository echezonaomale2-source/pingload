import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, SearchBar, DataTable, Badge, PageLoader, ErrorAlert } from '../components';
import { refundsApi, getErrorMessage } from '../services/adminService';
import { formatCurrency, formatDate, SERVICE_LABELS } from '../utils/formatters';

const RefundsPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRefunds = useCallback(() => {
    setLoading(true);
    refundsApi.list({ search, startDate, endDate, page, limit: 10 })
      .then((res) => setRefunds(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [search, startDate, endDate, page]);

  useEffect(() => { fetchRefunds(); }, [fetchRefunds]);

  const columns = [
    {
      key: 'refundReference',
      label: 'Refund Ref',
      render: (r) => <span className="font-mono text-xs">{r.refundReference || r.reference}</span>,
    },
    { key: 'userName', label: 'User', render: (r) => <span className="font-semibold">{r.userName}</span> },
    {
      key: 'service',
      label: 'Service',
      render: (r) => SERVICE_LABELS[r.service] || r.service,
    },
    {
      key: 'amount',
      label: 'Amount',
      render: (r) => <span className="font-bold text-emerald-600">{formatCurrency(r.refundAmount || r.amount)}</span>,
    },
    {
      key: 'originalTransactionReference',
      label: 'Original Ref',
      render: (r) => <span className="font-mono text-xs text-slate-500">{r.originalTransactionReference || '—'}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: () => <Badge status="refunded">Refunded</Badge>,
    },
    {
      key: 'refundedAt',
      label: 'Refund Date',
      render: (r) => formatDate(r.refundedAt || r.createdAt),
    },
  ];

  if (error) return <ErrorAlert message={error} />;

  return (
    <div>
      <PageHeader
        title="Refund Management"
        subtitle="View and search all automatic and processed refunds"
      />

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchBar
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search by user, refund ref, original ref, or reason..."
          className="max-w-xl flex-1"
        />
        <input
          type="date"
          value={startDate}
          onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-primary"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 outline-none focus:border-primary"
        />
      </div>

      {loading ? <PageLoader /> : (
        <DataTable
          columns={columns}
          data={refunds}
          page={page}
          onPageChange={setPage}
          onRowClick={(row) => navigate(`/refunds/${row.id}`)}
        />
      )}
    </div>
  );
};

export default RefundsPage;
