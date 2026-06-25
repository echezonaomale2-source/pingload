import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Badge, PageLoader, ErrorAlert } from '../components';
import { transactionsApi, getErrorMessage } from '../services/adminService';
import { formatCurrency, formatDate, SERVICE_LABELS } from '../utils/formatters';

const TransactionDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tx, setTx] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    transactionsApi.get(id)
      .then((res) => setTx(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <PageLoader />;
  if (error) return <ErrorAlert message={error} />;
  if (!tx) return null;

  const userName = tx.userId?.fullName || 'Unknown';
  const isRefund = tx.transactionType === 'refund';
  const details = [
    { label: 'Transaction ID', value: String(tx._id || tx.id) },
    { label: 'Reference', value: tx.reference },
    { label: 'User', value: userName },
    { label: 'User ID', value: String(tx.userId?._id || tx.userId || '—') },
    { label: 'Service', value: SERVICE_LABELS[tx.service] || tx.service },
    { label: 'Type', value: tx.transactionType },
    { label: 'Amount', value: formatCurrency(tx.amount) },
    { label: 'Status', value: isRefund ? 'refunded' : tx.status },
    { label: 'Description', value: tx.description || '—' },
    { label: 'Date', value: formatDate(tx.createdAt) },
  ];

  if (isRefund) {
    details.push(
      { label: 'Refund Reference', value: tx.refundReference || tx.reference },
      { label: 'Original Transaction Reference', value: tx.originalTransactionReference || '—' },
      { label: 'Refund Amount', value: formatCurrency(tx.refundAmount || tx.amount), highlight: true },
      { label: 'Refund Date', value: formatDate(tx.refundedAt || tx.createdAt) },
      { label: 'Refund Reason', value: tx.refundReason || '—' }
    );
  } else if (tx.metadata?.refunded) {
    details.push(
      { label: 'Refund Reference', value: tx.metadata.refundReference || '—' },
      { label: 'Refund Date', value: formatDate(tx.metadata.refundedAt) },
      { label: 'Refund Reason', value: tx.metadata.refundReason || '—' }
    );
  }

  return (
    <div>
      <button type="button" onClick={() => navigate('/transactions')} className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary">
        <ArrowLeft size={18} /> Back to Transactions
      </button>

      <div className="mx-auto max-w-2xl">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-extrabold text-slate-900">Transaction Details</h1>
            <Badge status={isRefund ? 'refunded' : tx.status}>{isRefund ? 'Refunded' : tx.status}</Badge>
          </div>
          <p className="mt-1 font-mono text-sm text-slate-400">{tx.reference}</p>

          <div className="mt-6 space-y-4">
            {details.map((d) => (
              <div key={d.label} className="flex items-center justify-between border-b border-slate-50 pb-3">
                <span className="text-sm text-slate-500">{d.label}</span>
                <span className={`max-w-[60%] text-right text-sm font-semibold capitalize ${d.highlight ? 'text-emerald-600' : 'text-slate-800'}`}>{d.value}</span>
              </div>
            ))}
          </div>

          {tx.metadata?.refundTransactionId ? (
            <button
              type="button"
              onClick={() => navigate(`/refunds/${tx.metadata.refundTransactionId}`)}
              className="mt-4 text-sm font-semibold text-primary hover:underline"
            >
              View refund record
            </button>
          ) : null}

          <div className="mt-6 rounded-xl bg-slate-50 p-4 text-center">
            <p className="text-sm text-slate-500">Amount</p>
            <p className={`text-3xl font-extrabold ${isRefund ? 'text-emerald-600' : 'text-primary'}`}>{formatCurrency(tx.amount)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionDetails;
