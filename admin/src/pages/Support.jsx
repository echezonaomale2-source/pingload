import { useState, useEffect } from 'react';
import { PageHeader, DataTable, Badge, Modal, PageLoader, ErrorAlert } from '../components';
import { supportApi, getErrorMessage } from '../services/adminService';
import { formatDate } from '../utils/formatters';
import { useDialog } from '../hooks/useDialog';

const SupportPage = () => {
  const dialog = useDialog();
  const [tickets, setTickets] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [reply, setReply] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = () => {
    setLoading(true);
    supportApi.list()
      .then((res) => setTickets(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTickets(); }, []);

  const columns = [
    { key: 'ticketId', label: 'Ticket ID', render: (r) => <span className="font-mono text-xs">{r.ticketId || String(r.id).slice(-6)}</span> },
    { key: 'user', label: 'User', render: (r) => <span className="font-semibold">{r.user}</span> },
    { key: 'subject', label: 'Subject' },
    { key: 'priority', label: 'Priority', render: (r) => <Badge status={r.priority}>{r.priority}</Badge> },
    { key: 'status', label: 'Status', render: (r) => <Badge status={r.status}>{r.status}</Badge> },
    { key: 'createdAt', label: 'Created', render: (r) => formatDate(r.createdAt) },
  ];

  const openTicket = async (ticket) => {
    try {
      const res = await supportApi.get(ticket.id);
      setSelected({ ...ticket, ...res.data.data });
      setMessages(res.data.data.messages || []);
      setReply('');
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    }
  };

  const handleReply = async () => {
    if (!reply.trim() || !selected) return;
    setSubmitting(true);
    try {
      const res = await supportApi.reply(selected.id || selected._id, reply);
      setMessages(res.data.data.messages || []);
      setReply('');
      fetchTickets();
      dialog.notifySuccess('Reply sent');
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const closeTicket = async () => {
    try {
      await supportApi.close(selected.id || selected._id);
      setSelected(null);
      fetchTickets();
      dialog.notifySuccess('Ticket closed');
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    }
  };

  if (error) return <ErrorAlert message={error} />;

  return (
    <div>
      <PageHeader title="Support Center" subtitle="Manage and respond to support tickets" />

      {loading ? <PageLoader /> : <DataTable columns={columns} data={tickets} page={page} onPageChange={setPage} onRowClick={openTicket} />}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.subject || 'Ticket'} size="lg">
        {selected && (
          <div>
            <div className="mb-4 flex flex-wrap gap-2">
              <Badge status={selected.status}>{selected.status}</Badge>
              <Badge status={selected.priority}>{selected.priority} priority</Badge>
              <span className="text-xs text-slate-400">by {selected.user || selected.userId?.fullName}</span>
            </div>

            <div className="mb-4 max-h-64 space-y-3 overflow-y-auto rounded-xl bg-slate-50 p-4">
              {messages.length === 0 ? (
                <p className="text-center text-sm text-slate-400">No messages</p>
              ) : messages.map((msg) => (
                <div key={msg._id || msg.id} className={`rounded-xl p-3 text-sm ${msg.role === 'admin' ? 'ml-8 bg-primary/10' : 'mr-8 bg-white'}`}>
                  <p className="mb-1 text-xs font-bold text-slate-500">{msg.sender}</p>
                  <p className="text-slate-700">{msg.message}</p>
                  <p className="mt-1 text-[10px] text-slate-400">{formatDate(msg.createdAt || msg.time)}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Type your reply..."
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-primary"
              />
              <button type="button" disabled={submitting} onClick={handleReply} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-60">
                Reply
              </button>
            </div>

            {selected.status !== 'closed' && (
              <button type="button" onClick={closeTicket} className="mt-3 w-full rounded-xl border border-slate-200 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">
                Close Ticket
              </button>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SupportPage;
