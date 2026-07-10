import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { PageHeader, DataTable, Badge, Modal, PageLoader, ErrorAlert } from '../components';
import { notificationsApi, usersApi, getErrorMessage } from '../services/adminService';
import { formatDate } from '../utils/formatters';
import { useDialog } from '../hooks/useDialog';

const NotificationsPage = () => {
  const dialog = useDialog();
  const [notifList, setNotifList] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUserLabel, setSelectedUserLabel] = useState('');
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
    setError('');
    notificationsApi.list()
      .then((notifRes) => {
        setNotifList(notifRes.data.data);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!modalOpen || recipient === 'all') return undefined;
    const timer = setTimeout(() => {
      setSearchingUsers(true);
      usersApi.list({ search: userSearch, page: 1, limit: 20 })
        .then((res) => setUserResults(res.data.data || []))
        .catch(() => setUserResults([]))
        .finally(() => setSearchingUsers(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearch, modalOpen, recipient]);

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
    if (recipient !== 'all' && !recipient) {
      dialog.notifyError('Select a recipient user');
      return;
    }
    setSubmitting(true);
    try {
      const res = await notificationsApi.send({
        title,
        message,
        recipient: recipient === 'all' ? 'all' : 'specific',
        userId: recipient === 'all' ? undefined : recipient,
        screen,
      });
      setModalOpen(false);
      setTitle('');
      setMessage('');
      setRecipient('all');
      setSelectedUserLabel('');
      setUserSearch('');
      setScreen('Notifications');
      fetchData();
      const push = res?.data?.data?.push;
      if (push?.skipped && push?.reason === 'fcm_not_configured') {
        dialog.notifySuccess('In-app notification saved. FCM is not configured on the server yet.');
      } else if (push?.skipped && push?.reason === 'no_tokens') {
        dialog.notifySuccess('In-app notification saved. No FCM device tokens registered. Users must open a production APK and allow notifications.');
      } else if (push?.skipped && push?.reason === 'fcm_send_error') {
        dialog.notifyError('Push send failed. Check Firebase credentials on the server.');
      } else if (push && (push.failed || 0) > 0) {
        const summary = push.errorSummary
          ? Object.entries(push.errorSummary).map(([k, v]) => `${k}: ${v}`).join(', ')
          : '';
        dialog.notifyError(
          `Push delivered: ${push.sent || 0}, failed: ${push.failed || 0}${summary ? ` (${summary})` : ''}. Ask users to re-open the app so tokens refresh.`
        );
      } else if (push) {
        dialog.notifySuccess(`Notification sent. Push delivered: ${push.sent || 0}`);
      } else {
        dialog.notifySuccess('Notification sent');
      }
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
            <select
              value={recipient === 'all' ? 'all' : 'specific'}
              onChange={(e) => {
                if (e.target.value === 'all') {
                  setRecipient('all');
                  setSelectedUserLabel('');
                } else {
                  setRecipient('');
                }
              }}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary"
            >
              <option value="all">All Users</option>
              <option value="specific">Specific User</option>
            </select>
          </div>
          {recipient !== 'all' ? (
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
                      setRecipient(u.id);
                      setSelectedUserLabel(u.fullName);
                    }}
                    className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${recipient === u.id ? 'bg-primary/5 font-semibold' : ''}`}
                  >
                    {u.fullName} — {u.email}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
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
