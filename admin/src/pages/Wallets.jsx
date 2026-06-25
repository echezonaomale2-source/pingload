import { useState, useEffect, useCallback } from 'react';
import { Plus, Minus } from 'lucide-react';
import { PageHeader, DataTable, Badge, Modal, SearchBar, PageLoader, ErrorAlert } from '../components';
import { walletsApi, usersApi, getErrorMessage } from '../services/adminService';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useDialog } from '../hooks/useDialog';

const WalletsPage = () => {
  const dialog = useDialog();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [history, setHistory] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [walletModal, setWalletModal] = useState(null);
  const [selectedUser, setSelectedUser] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      walletsApi.history({ search, page, limit: 8 }),
      usersApi.list({ limit: 50 }),
    ])
      .then(([histRes, usersRes]) => {
        setHistory(histRes.data.data);
        setUsers(usersRes.data.data);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [search, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = [
    { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs">{String(r.id).slice(-8)}</span> },
    { key: 'userName', label: 'User', render: (r) => <span className="font-semibold">{r.userName}</span> },
    { key: 'type', label: 'Type', render: (r) => <Badge status={r.type}>{r.type}</Badge> },
    { key: 'amount', label: 'Amount', render: (r) => <span className={r.type === 'credit' ? 'font-semibold text-emerald-600' : 'font-semibold text-red-500'}>{r.type === 'credit' ? '+' : '-'}{formatCurrency(r.amount)}</span> },
    { key: 'note', label: 'Note' },
    { key: 'createdAt', label: 'Date', render: (r) => formatDate(r.createdAt) },
  ];

  const handleAdjust = async () => {
    if (!selectedUser || !amount) return;
    setSubmitting(true);
    try {
      await walletsApi.adjust({ userId: selectedUser, type: walletModal, amount: parseFloat(amount), note });
      setWalletModal(null);
      setSelectedUser('');
      setAmount('');
      setNote('');
      fetchData();
      dialog.notifySuccess(`Wallet ${walletModal === 'credit' ? 'credited' : 'debited'} successfully`);
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (error) return <ErrorAlert message={error} />;

  return (
    <div>
      <PageHeader
        title="Wallet Management"
        subtitle="Credit, debit, and view wallet history"
        action={
          <div className="flex gap-2">
            <button type="button" onClick={() => setWalletModal('credit')} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
              <Plus size={18} /> Credit Wallet
            </button>
            <button type="button" onClick={() => setWalletModal('debit')} className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-600">
              <Minus size={18} /> Debit Wallet
            </button>
          </div>
        }
      />

      {users.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          {users.slice(0, 3).map((u) => (
            <div key={u.id} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
              <p className="text-sm font-semibold text-slate-800">{u.fullName}</p>
              <p className="text-xs text-slate-400">{u.email}</p>
              <p className="mt-2 text-xl font-extrabold text-primary">{formatCurrency(u.walletBalance)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search wallet history..." className="max-w-md" />
      </div>

      <h3 className="mb-3 text-base font-bold text-slate-800">Wallet History</h3>
      {loading ? <PageLoader /> : <DataTable columns={columns} data={history} page={page} onPageChange={setPage} />}

      <Modal open={!!walletModal} onClose={() => setWalletModal(null)} title={walletModal === 'credit' ? 'Credit Wallet' : 'Debit Wallet'}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Select User</label>
            <select value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary">
              <option value="">Choose a user...</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.fullName} — {formatCurrency(u.walletBalance)}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Amount (₦)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Note</label>
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <button type="button" disabled={submitting} onClick={handleAdjust} className={`w-full rounded-xl py-3 text-sm font-bold text-white disabled:opacity-60 ${walletModal === 'credit' ? 'bg-emerald-600' : 'bg-red-500'}`}>
            {submitting ? 'Processing...' : `Confirm ${walletModal === 'credit' ? 'Credit' : 'Debit'}`}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default WalletsPage;
