import { useState, useEffect, useCallback } from 'react';
import { Plus, Minus } from 'lucide-react';
import { PageHeader, DataTable, Badge, Modal, SearchBar, PageLoader, ErrorAlert } from '../components';
import { walletsApi, usersApi, getErrorMessage } from '../services/adminService';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useDialog } from '../hooks/useDialog';

const PAGE_SIZE = 8;

const WalletsPage = () => {
  const dialog = useDialog();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [history, setHistory] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [walletModal, setWalletModal] = useState(null);
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedUserLabel, setSelectedUserLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError('');
    walletsApi.history({ search, page, limit: PAGE_SIZE })
      .then((histRes) => {
        setHistory(histRes.data.data);
        setTotal(histRes.data.pagination?.total || 0);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [search, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!walletModal) return undefined;
    const timer = setTimeout(() => {
      setSearchingUsers(true);
      usersApi.list({ search: userSearch, page: 1, limit: 20 })
        .then((res) => setUserResults(res.data.data || []))
        .catch(() => setUserResults([]))
        .finally(() => setSearchingUsers(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch, walletModal]);

  const columns = [
    { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs">{String(r.id).slice(-8)}</span> },
    { key: 'userName', label: 'User', render: (r) => <span className="font-semibold">{r.userName}</span> },
    { key: 'type', label: 'Type', render: (r) => <Badge status={r.type}>{r.type}</Badge> },
    { key: 'amount', label: 'Amount', render: (r) => <span className={r.type === 'credit' ? 'font-semibold text-emerald-600' : 'font-semibold text-red-500'}>{r.type === 'credit' ? '+' : '-'}{formatCurrency(r.amount)}</span> },
    { key: 'note', label: 'Note' },
    { key: 'createdAt', label: 'Date', render: (r) => formatDate(r.createdAt) },
  ];

  const openModal = (type) => {
    setWalletModal(type);
    setSelectedUser('');
    setSelectedUserLabel('');
    setUserSearch('');
    setAmount('');
    setNote('');
  };

  const handleAdjust = async () => {
    if (!selectedUser || !amount) {
      dialog.notifyError('Select a user and enter a valid amount');
      return;
    }
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      dialog.notifyError('Enter a valid amount greater than zero');
      return;
    }
    setSubmitting(true);
    try {
      await walletsApi.adjust({ userId: selectedUser, type: walletModal, amount: amt, note });
      setWalletModal(null);
      setSelectedUser('');
      setSelectedUserLabel('');
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

  if (error) {
    return (
      <div>
        <ErrorAlert message={error} />
        <button type="button" onClick={fetchData} className="mt-4 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Wallet Management"
        subtitle="Credit, debit, and view wallet history"
        action={
          <div className="flex gap-2">
            <button type="button" onClick={() => openModal('credit')} className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700">
              <Plus size={18} /> Credit Wallet
            </button>
            <button type="button" onClick={() => openModal('debit')} className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-600">
              <Minus size={18} /> Debit Wallet
            </button>
          </div>
        }
      />

      <div className="mb-4">
        <SearchBar value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search wallet history..." className="max-w-md" />
      </div>

      <h3 className="mb-3 text-base font-bold text-slate-800">Wallet History</h3>
      {loading ? <PageLoader /> : (
        <DataTable
          columns={columns}
          data={history}
          page={page}
          pageSize={PAGE_SIZE}
          totalPages={Math.ceil(total / PAGE_SIZE)}
          serverPaginated
          onPageChange={setPage}
        />
      )}

      <Modal open={!!walletModal} onClose={() => setWalletModal(null)} title={walletModal === 'credit' ? 'Credit Wallet' : 'Debit Wallet'}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Search User</label>
            <input
              type="text"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Name, email, or phone..."
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            {selectedUserLabel ? (
              <p className="mt-2 text-sm font-semibold text-emerald-700">Selected: {selectedUserLabel}</p>
            ) : null}
            <div className="mt-2 max-h-40 overflow-y-auto rounded-xl border border-slate-200">
              {searchingUsers ? (
                <p className="px-3 py-2 text-sm text-slate-400">Searching...</p>
              ) : userResults.length === 0 ? (
                <p className="px-3 py-2 text-sm text-slate-400">No users found</p>
              ) : userResults.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setSelectedUser(u.id);
                    setSelectedUserLabel(`${u.fullName} — ${formatCurrency(u.walletBalance)}`);
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${selectedUser === u.id ? 'bg-primary/5 font-semibold' : ''}`}
                >
                  {u.fullName} — {u.email} — {formatCurrency(u.walletBalance)}
                </button>
              ))}
            </div>
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
