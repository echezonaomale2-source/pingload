import { useState, useEffect } from 'react';
import { Trophy } from 'lucide-react';
import { PageHeader, DataTable, Badge, StatCard, PageLoader, ErrorAlert } from '../components';
import { referralsApi, getErrorMessage } from '../services/adminService';
import { formatCurrency, formatDate } from '../utils/formatters';

const ReferralsPage = () => {
  const [referrals, setReferrals] = useState([]);
  const [topReferrers, setTopReferrers] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([referralsApi.list(), referralsApi.top()])
      .then(([refRes, topRes]) => {
        setReferrals(refRes.data.data);
        setTopReferrers(topRes.data.data);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  const totalEarnings = referrals.reduce((sum, r) => sum + (r.earnings || 0), 0);

  const columns = [
    { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs">{String(r.id).slice(-6)}</span> },
    { key: 'referrer', label: 'Referrer', render: (r) => <span className="font-semibold">{r.referrer}</span> },
    { key: 'referred', label: 'Referred User' },
    { key: 'earnings', label: 'Earnings', render: (r) => formatCurrency(r.earnings) },
    { key: 'status', label: 'Status', render: (r) => <Badge status={r.status}>{r.status}</Badge> },
    { key: 'date', label: 'Date', render: (r) => formatDate(r.date) },
  ];

  if (loading) return <PageLoader />;
  if (error) return <ErrorAlert message={error} />;

  return (
    <div>
      <PageHeader title="Referral Management" subtitle="Track referrals and top performers" />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard title="Total Referrals" value={referrals.length.toString()} icon={Trophy} color="primary" />
        <StatCard title="Total Earnings" value={formatCurrency(totalEarnings)} color="secondary" />
        <StatCard title="Completed" value={referrals.filter((r) => r.status === 'completed').length.toString()} color="success" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm lg:col-span-1">
          <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800">
            <Trophy size={18} className="text-secondary" /> Top Referrers
          </h3>
          {topReferrers.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">No referrers yet</p>
          ) : (
            <div className="space-y-3">
              {topReferrers.map((r) => (
                <div key={r.rank} className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-extrabold ${
                    r.rank === 1 ? 'bg-secondary text-white' : r.rank === 2 ? 'bg-slate-300 text-slate-700' : 'bg-amber-100 text-amber-700'
                  }`}>{r.rank}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-800">{r.name}</p>
                    <p className="text-xs text-slate-400">{r.referrals} referrals</p>
                  </div>
                  <p className="text-sm font-bold text-primary">{formatCurrency(r.earnings)}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2">
          <h3 className="mb-3 text-base font-bold text-slate-800">All Referrals</h3>
          <DataTable columns={columns} data={referrals} page={page} onPageChange={setPage} />
        </div>
      </div>
    </div>
  );
};

export default ReferralsPage;
