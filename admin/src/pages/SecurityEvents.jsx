import { useCallback, useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { PageHeader, DataTable, PageLoader, ErrorAlert } from '../components';
import { securityEventsApi, getErrorMessage } from '../services/adminService';

const EVENT_TYPES = [
  { value: 'all', label: 'All Events' },
  { value: 'login_pin_failed', label: 'Failed PIN' },
  { value: 'login_pin_locked', label: 'Account Locks' },
  { value: 'login_failed', label: 'Failed Login' },
  { value: 'password_reset', label: 'Password Reset' },
  { value: 'password_changed', label: 'Password Changed' },
  { value: 'otp_failed', label: 'OTP Failed' },
  { value: 'device_changed', label: 'Device Changes' },
  { value: 'suspicious_activity', label: 'Suspicious Activity' },
];

const severityClass = (severity) => {
  if (severity === 'critical') return 'bg-red-100 text-red-700';
  if (severity === 'high') return 'bg-orange-100 text-orange-700';
  if (severity === 'medium') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-600';
};

const SecurityEventsPage = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventType, setEventType] = useState('all');
  const [search, setSearch] = useState('');

  const fetchEvents = useCallback(() => {
    setLoading(true);
    securityEventsApi.list({ eventType, search })
      .then((res) => setEvents(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [eventType, search]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const columns = [
    {
      key: 'createdAt',
      label: 'Time',
      render: (r) => new Date(r.createdAt).toLocaleString(),
    },
    { key: 'eventType', label: 'Event', render: (r) => r.eventType.replace(/_/g, ' ') },
    {
      key: 'severity',
      label: 'Severity',
      render: (r) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold capitalize ${severityClass(r.severity)}`}>
          {r.severity}
        </span>
      ),
    },
    { key: 'userName', label: 'User' },
    { key: 'message', label: 'Message' },
    { key: 'ipAddress', label: 'IP' },
    { key: 'deviceInfo', label: 'Device' },
  ];

  if (error) return <ErrorAlert message={error} />;

  return (
    <div>
      <PageHeader
        title="Security Events"
        subtitle="Account locks, failed attempts, and audit trail"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <select
          value={eventType}
          onChange={(e) => setEventType(e.target.value)}
          className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          {EVENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search IP, device, message..."
          className="min-w-[220px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      {loading ? <PageLoader /> : <DataTable columns={columns} data={events} />}
    </div>
  );
};

export default SecurityEventsPage;
