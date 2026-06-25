import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { PageHeader, DataTable, Badge, Modal, PageLoader, ErrorAlert } from '../components';
import { notificationsApi, usersApi, getErrorMessage } from '../services/adminService';
import { formatDate } from '../utils/formatters';
import { useDialog } from '../hooks/useDialog';

const NotificationsPage = () => {
  const dialog = useDialog();
  const [notifList, setNotifList] = useState([]);
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [recipient, setRecipient] = useState('all');
  const [screen, setScreen] = useState('Notifications');
  const [submitting, setSubmitting] = useState(false);

  const screenOptions = [
    { value: 'Notifications', label: 'Notifications' },
    { value: 'Home', label: 'Home' },
    { value: 'Wallet', label: 'Wallet' },
    { value: 'History', label: 'Transaction History' },
    { value: 'Profile', label: 'Profile' },
    { value: 'Support', label: 'Support' },
    { value: 'FundWallet', label: 'Fund Wallet' },
  ];

  const fetchData = () => {
    setLoading(true);
    Promise.all([notificationsApi.list(), usersApi.list({ limit: 100 })])
      .then(([notifRes, usersRes]) => {
        setNotifList(notifRes.data.data);
        setUsers(usersRes.data.data);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const columns = [
    { key: 'id', label: 'ID', render: (r) => <span className="font-mono text-xs">{String(r.id).slice(-6)}</span> },
    { key: 'title', label: 'Title', render: (r) => <span className="font-semibold">{r.title}</span> },
    { key: 'message', label: 'Message', render: (r) => <span className="max-w-xs truncate block">{r.message}</span> },
    { key: 'recipient', label: 'Recipient' },
    { key: 'status', label: 'Status', render: (r) => <Badge status={r.status}>{r.status}</Badge> },
    { key: 'sentAt', label: 'Sent', render: (r) => formatDate(r.sentAt) },
  ];

  const handleSend = async () => {
    if (!title || !message) return;
    setSubmitting(true);
    try {
      const res = await notificationsApi.send({
        title,
        message,
        recipient,
        userId: recipient === 'all' ? undefined : recipient,
        screen,
      });
      setModalOpen(false);
      setTitle('');
      setMessage('');
      setRecipient('all');
      setScreen('Notifications');
      fetchData();
      const push = res?.data?.data?.push;
      if (push?.skipped && push?.reason === 'fcm_not_configured') {
        dialog.notifySuccess('In-app notification saved. FCM is not configured on the server yet.');
      } else if (push) {
        dialog.notifySuccess(`Notification sent. Push delivered: ${push.sent || 0}, failed: ${push.failed || 0}`);
      } else {
        dialog.notifySuccess('Notification sent');
      }
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
        title="Notification Center"
        subtitle="Send and manage user notifications"
        action={
          <button type="button" onClick={() => setModalOpen(true)} className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-secondary/20 hover:bg-secondary-dark">
            <Send size={18} /> Send Notification
          </button>
        }
      />

      {loading ? <PageLoader /> : <DataTable columns={columns} data={notifList} page={page} onPageChange={setPage} />}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Send Notification" size="lg">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Recipient</label>
            <select value={recipient} onChange={(e) => setRecipient(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary">
              <option value="all">All Users</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Open screen on tap</label>
            <select value={screen} onChange={(e) => setScreen(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary">
              {screenOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Message</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <button type="button" disabled={submitting} onClick={handleSend} className="w-full rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-60">
            {submitting ? 'Sending...' : 'Send Notification'}
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default NotificationsPage;
