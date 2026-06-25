import { useState, useEffect } from 'react';
import { PageHeader, DataTable, Badge, Modal, PageLoader, ErrorAlert } from '../components';
import { kycApi, getErrorMessage } from '../services/adminService';
import { formatDate } from '../utils/formatters';
import { useDialog } from '../hooks/useDialog';

const KycPage = () => {
  const dialog = useDialog();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState('');

  const fetchList = () => {
    setLoading(true);
    kycApi.list(filter ? { status: filter } : {})
      .then((res) => setList(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchList(); }, [filter]);

  const openDetail = async (row) => {
    setSelected(row);
    setAdminNote('');
    try {
      const res = await kycApi.get(row.id);
      setDetail(res.data.data);
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    }
  };

  const handleReview = async (status) => {
    if (!selected) return;
    setActionLoading(true);
    try {
      await kycApi.review(selected.id, { status, adminNote });
      setSelected(null);
      setDetail(null);
      fetchList();
      dialog.notifySuccess(status === 'verified' ? 'KYC approved' : 'KYC rejected');
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    { key: 'userName', label: 'User', render: (r) => <span className="font-semibold">{r.userName}</span> },
    { key: 'email', label: 'Email' },
    { key: 'idType', label: 'ID Type', render: (r) => r.idType?.replace(/_/g, ' ') },
    { key: 'status', label: 'Status', render: (r) => <Badge status={r.status}>{r.status}</Badge> },
    { key: 'submittedAt', label: 'Submitted', render: (r) => formatDate(r.submittedAt) },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <button type="button" onClick={(e) => { e.stopPropagation(); openDetail(r); }} className="text-sm font-bold text-primary hover:underline">
          Review
        </button>
      ),
    },
  ];

  if (error) return <ErrorAlert message={error} />;

  return (
    <div>
      <PageHeader title="KYC Verification" subtitle="Review and approve user identity documents" />

      <div className="mb-4 flex gap-2">
        {['', 'pending', 'verified', 'rejected'].map((s) => (
          <button
            key={s || 'all'}
            type="button"
            onClick={() => setFilter(s)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize ${filter === s ? 'bg-primary text-white' : 'bg-slate-100 text-slate-600'}`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? <PageLoader /> : <DataTable columns={columns} data={list} />}

      <Modal open={!!selected} onClose={() => { setSelected(null); setDetail(null); }} title="KYC Review">
        {detail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><span className="text-slate-500">Full Name</span><p className="font-semibold">{detail.fullName}</p></div>
              <div><span className="text-slate-500">ID Number</span><p className="font-semibold">{detail.idNumber}</p></div>
              <div><span className="text-slate-500">DOB</span><p className="font-semibold">{detail.dateOfBirth}</p></div>
              <div><span className="text-slate-500">Address</span><p className="font-semibold">{detail.address}</p></div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {detail.idFrontImage && <img src={detail.idFrontImage} alt="ID Front" className="rounded-lg border max-h-32 object-cover w-full" />}
              {detail.idBackImage && <img src={detail.idBackImage} alt="ID Back" className="rounded-lg border max-h-32 object-cover w-full" />}
              {detail.selfieImage && <img src={detail.selfieImage} alt="Selfie" className="rounded-lg border max-h-32 object-cover w-full" />}
            </div>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder="Admin note (optional)"
              className="w-full rounded-xl border border-slate-200 p-3 text-sm"
              rows={2}
            />
            {detail.status === 'pending' && (
              <div className="flex gap-2">
                <button type="button" disabled={actionLoading} onClick={() => handleReview('verified')} className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-sm font-bold text-white">
                  Approve
                </button>
                <button type="button" disabled={actionLoading} onClick={() => handleReview('rejected')} className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-bold text-white">
                  Reject
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default KycPage;
