import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader, DataTable, Modal, PageLoader, ErrorAlert } from '../components';
import { electricityPlansApi, getErrorMessage } from '../services/adminService';
import { formatCurrency } from '../utils/formatters';
import { useDialog } from '../hooks/useDialog';

const emptyForm = {
  providerId: '',
  name: '',
  vtpassServiceId: '',
  minAmount: 500,
  maxAmount: 500000,
  enabled: true,
  order: 0,
};

const ElectricityPlansPage = () => {
  const dialog = useDialog();
  const [plans, setPlans] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchPlans = useCallback(() => {
    setLoading(true);
    electricityPlansApi.list()
      .then((res) => setPlans(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  const openCreate = () => { setForm(emptyForm); setModal('create'); };
  const openEdit = (plan) => {
    setForm({
      providerId: plan.providerId,
      name: plan.name,
      vtpassServiceId: plan.vtpassServiceId,
      minAmount: plan.minAmount,
      maxAmount: plan.maxAmount,
      enabled: plan.enabled,
      order: plan.order,
    });
    setModal(plan._id);
  };

  const handleSave = async () => {
    const payload = {
      ...form,
      providerId: form.providerId.trim().toLowerCase(),
      minAmount: Number(form.minAmount),
      maxAmount: Number(form.maxAmount),
      order: Number(form.order),
    };
    try {
      if (modal === 'create') await electricityPlansApi.create(payload);
      else await electricityPlansApi.update(modal, payload);
      setModal(null);
      fetchPlans();
      dialog.notifySuccess(modal === 'create' ? 'Electricity plan created' : 'Electricity plan updated');
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    }
  };

  const handleDelete = async (id) => {
    const ok = await dialog.confirm({
      title: 'Delete Electricity Plan',
      message: 'Delete this electricity provider?',
      confirmText: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await electricityPlansApi.delete(id);
      fetchPlans();
      dialog.notifySuccess('Electricity plan deleted');
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    }
  };

  const toggleEnabled = async (plan) => {
    try {
      await electricityPlansApi.update(plan._id, { enabled: !plan.enabled });
      fetchPlans();
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    }
  };

  const columns = [
    { key: 'providerId', label: 'ID', render: (r) => <span className="font-mono text-xs">{r.providerId}</span> },
    { key: 'name', label: 'Provider' },
    { key: 'vtpassServiceId', label: 'VTpass ID', render: (r) => <span className="font-mono text-xs">{r.vtpassServiceId}</span> },
    {
      key: 'range',
      label: 'Amount Range',
      render: (r) => `${formatCurrency(r.minAmount)} – ${formatCurrency(r.maxAmount)}`,
    },
    { key: 'order', label: 'Order' },
    {
      key: 'enabled',
      label: 'Status',
      render: (r) => (
        <button type="button" onClick={(e) => { e.stopPropagation(); toggleEnabled(r); }} className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${r.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          {r.enabled ? 'Enabled' : 'Disabled'}
        </button>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex gap-1">
          <button type="button" onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="p-1 text-primary"><Pencil size={14} /></button>
          <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(r._id); }} className="p-1 text-red-500"><Trash2 size={14} /></button>
        </div>
      ),
    },
  ];

  if (error) return <ErrorAlert message={error} />;

  return (
    <div>
      <PageHeader
        title="Electricity Plans"
        subtitle="Manage electricity providers shown in the user app"
        action={
          <button type="button" onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white">
            <Plus size={18} /> Add Provider
          </button>
        }
      />

      {loading ? <PageLoader /> : (
        <DataTable
          columns={columns}
          data={plans}
          page={page}
          pageSize={25}
          onPageChange={setPage}
        />
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add Electricity Provider' : 'Edit Electricity Provider'}>
        <div className="space-y-3">
          <input value={form.providerId} onChange={(e) => setForm({ ...form, providerId: e.target.value })} placeholder="Provider ID (e.g. ikeja)" className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Display name" className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
          <input value={form.vtpassServiceId} onChange={(e) => setForm({ ...form, vtpassServiceId: e.target.value })} placeholder="VTpass service ID (e.g. ikeja-electric)" className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })} placeholder="Min amount" className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
            <input type="number" value={form.maxAmount} onChange={(e) => setForm({ ...form, maxAmount: e.target.value })} placeholder="Max amount" className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
          </div>
          <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} placeholder="Display order" className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
            Enabled
          </label>
          <button type="button" onClick={handleSave} className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-white">Save</button>
        </div>
      </Modal>
    </div>
  );
};

export default ElectricityPlansPage;
