import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Ban, CheckCircle, Plus, Minus, Trash2 } from 'lucide-react';
import { PageHeader, Badge, Modal, PageLoader, ErrorAlert } from '../components';
import { usersApi, getErrorMessage } from '../services/adminService';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useDialog } from '../hooks/useDialog';

const UserDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dialog = useDialog();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [walletModal, setWalletModal] = useState(null);
  const [walletAmount, setWalletAmount] = useState('');
  const [walletNote, setWalletNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUser = () => {
    setLoading(true);
    usersApi.get(id)
      .then((res) => setUser(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchUser(); }, [id]);

  const handleStatus = async (status) => {
    setActionLoading(true);
    try {
      await usersApi.updateStatus(id, status);
      fetchUser();
      dialog.notifySuccess(status === 'active' ? 'User activated' : 'User suspended');
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleWallet = async () => {
    const amt = parseFloat(walletAmount);
    if (!amt || amt <= 0) return;
    setActionLoading(true);
    try {
      await usersApi.adjustWallet(id, { type: walletModal, amount: amt, note: walletNote });
      setWalletModal(null);
      setWalletAmount('');
      setWalletNote('');
      fetchUser();
      dialog.notifySuccess(`Wallet ${walletModal === 'credit' ? 'credited' : 'debited'} successfully`);
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    const ok = await dialog.confirm({
      title: 'Delete User',
      message: `Delete user ${user.fullName}? This cannot be undone.`,
      confirmText: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    setActionLoading(true);
    try {
      await usersApi.delete(id);
      navigate('/users');
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorAlert message={error} />;
  if (!user) return null;

  const transactions = user.recentTransactions || [];

  return (
    <div>
      <button type="button" onClick={() => navigate('/users')} className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-primary">
        <ArrowLeft size={18} /> Back to Users
      </button>

      <PageHeader title={user.fullName} subtitle={user.email} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-2xl font-extrabold text-white">
              {user.fullName.charAt(0)}
            </div>
            <h2 className="mt-4 text-xl font-extrabold text-slate-900">{user.fullName}</h2>
            <p className="text-sm text-slate-500">{user.phone}</p>
            <div className="mt-3 flex gap-2">
              <Badge status={user.status}>{user.status}</Badge>
              <Badge status={user.kycStatus}>{user.kycStatus}</Badge>
            </div>

            <div className="mt-6 space-y-3 border-t border-slate-100 pt-4 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">User ID</span><span className="font-mono text-xs font-semibold">{String(user.id).slice(-8)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Joined</span><span className="font-semibold">{formatDate(user.joinedAt)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Transactions</span><span className="font-semibold">{user.transactions}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Wallet</span><span className="text-lg font-extrabold text-primary">{formatCurrency(user.walletBalance)}</span></div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {user.status === 'active' ? (
                <button type="button" disabled={actionLoading} onClick={() => handleStatus('suspended')} className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100">
                  <Ban size={14} /> Suspend
                </button>
              ) : (
                <button type="button" disabled={actionLoading} onClick={() => handleStatus('active')} className="flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-600 hover:bg-emerald-100">
                  <CheckCircle size={14} /> Activate
                </button>
              )}
              <button type="button" onClick={() => setWalletModal('credit')} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">
                <Plus size={14} /> Credit
              </button>
              <button type="button" onClick={() => setWalletModal('debit')} className="flex items-center gap-1.5 rounded-xl bg-red-500 px-3 py-2 text-xs font-bold text-white hover:bg-red-600">
                <Minus size={14} /> Debit
              </button>
              <button type="button" disabled={actionLoading} onClick={handleDelete} className="flex items-center gap-1.5 rounded-xl border border-red-300 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4">
              <h3 className="font-bold text-slate-800">Transaction History</h3>
            </div>
            {transactions.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-400">No transactions yet</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-bold uppercase text-slate-500">
                    <th className="px-5 py-3">ID</th><th className="px-5 py-3">Service</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx._id || tx.id} className="border-b border-slate-50">
                      <td className="px-5 py-3 font-mono text-xs">{String(tx._id || tx.id).slice(-8)}</td>
                      <td className="px-5 py-3 capitalize">{tx.service?.replace(/_/g, ' ')}</td>
                      <td className="px-5 py-3 font-semibold">{formatCurrency(tx.amount)}</td>
                      <td className="px-5 py-3"><Badge status={tx.status}>{tx.status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <Modal open={!!walletModal} onClose={() => setWalletModal(null)} title={walletModal === 'credit' ? 'Credit Wallet' : 'Debit Wallet'}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Amount (₦)</label>
            <input type="number" value={walletAmount} onChange={(e) => setWalletAmount(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Note</label>
            <input type="text" value={walletNote} onChange={(e) => setWalletNote(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" placeholder="Reason for adjustment" />
          </div>
          <button type="button" disabled={actionLoading} onClick={handleWallet} className={`w-full rounded-xl py-3 text-sm font-bold text-white ${walletModal === 'credit' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'} disabled:opacity-60`}>
            {actionLoading ? 'Processing...' : `Confirm ${walletModal === 'credit' ? 'Credit' : 'Debit'}`}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default UserDetails;
