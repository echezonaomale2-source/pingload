import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Badge, PageLoader, ErrorAlert } from '../components';
import { refundsApi, getErrorMessage } from '../services/adminService';
import { formatCurrency, formatDate, SERVICE_LABELS } from '../utils/formatters';

const RefundDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [refund, setRefund] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    refundsApi.get(id)
      .then((res) => setRefund(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader />;
  if (error) return <ErrorAlert message={error} />;
  if (!refund) return null;

  const userName = refund.userId?.fullName || 'Unknown';
  const original = refund.originalTransactionId;

  const details = [
    { label: 'Refund ID', value: String(refund._id || refund.id) },
    { label: 'Refund Reference', value: refund.refundReference || refund.reference },
    { label: 'Original Transaction Reference', value: refund.originalTransactionReference || '—' },
    { label: 'User', value: userName },
    { label: 'User Email', value: refund.userId?.email || '—' },
    { label: 'Service', value: SERVICE_LABELS[refund.service] || refund.service },
    { label: 'Refund Amount', value: formatCurrency(refund.refundAmount || refund.amount), highlight: true },
    { label: 'Refund Date', value: formatDate(refund.refundedAt || refund.createdAt) },
    { label: 'Refund Reason', value: refund.refundReason || '—' },
    { label: 'Status', value: 'Refunded' },
    { label: 'Description', value: refund.description || '—' },
  ];

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/refunds')}
        className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary"
      >
        <ArrowLeft size={18} /> Back to Refunds
      </button>

      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-extrabold text-slate-900">Refund Details</h1>
            <Badge status="refunded">Refunded</Badge>
          </div>
          <p className="mt-1 font-mono text-sm text-slate-400">{refund.refundReference || refund.reference}</p>

          <div className="mt-6 space-y-4">
            {details.map((d) => (
              <div key={d.label} className="flex items-center justify-between border-b border-slate-50 pb-3">
                <span className="text-sm text-slate-500">{d.label}</span>
                <span className={`max-w-[60%] text-right text-sm font-semibold capitalize ${d.highlight ? 'text-emerald-600' : 'text-slate-800'}`}>
                  {d.value}
                </span>
              </div>
            ))}
          </div>

          {original ? (
            <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Original Transaction</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Reference</span>
                  <span className="font-mono font-semibold text-slate-800">{original.reference}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-semibold text-slate-800">{formatCurrency(original.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <Badge status={original.status}>{original.status}</Badge>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/transactions/${original._id}`)}
                  className="mt-2 text-sm font-semibold text-primary hover:underline"
                >
                  View original transaction
                </button>
              </div>
            </div>
          ) : null}

          <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-center">
            <p className="text-sm text-emerald-700">Refund Amount</p>
            <p className="text-3xl font-extrabold text-emerald-600">{formatCurrency(refund.refundAmount || refund.amount)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RefundDetails;
