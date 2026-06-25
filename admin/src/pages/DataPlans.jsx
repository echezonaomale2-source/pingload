import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader, DataTable, Modal, PageLoader, ErrorAlert } from '../components';
import { dataPlansApi, getErrorMessage } from '../services/adminService';
import { formatCurrency } from '../utils/formatters';
import { useDialog } from '../hooks/useDialog';

const NETWORKS = ['mtn', 'airtel', 'glo', '9mobile'];
const emptyForm = { network: 'mtn', name: '', dataSize: '', validity: '', variationCode: '', amount: '', enabled: true, order: 0 };

const DataPlansPage = () => {
  const dialog = useDialog();
  const [plans, setPlans] = useState([]);
  const [network, setNetwork] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchPlans = () => {
    setLoading(true);
    dataPlansApi.list(network ? { network } : {})
      .then((res) => setPlans(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPlans(); }, [network]);

  const openCreate = () => { setForm({ ...emptyForm, network: network || 'mtn' }); setModal('create'); };
  const openEdit = (plan) => {
    setForm({
      network: plan.network,
      name: plan.name,
      dataSize: plan.dataSize,
      validity: plan.validity,
      variationCode: plan.variationCode,
      amount: plan.amount,
      enabled: plan.enabled,
      order: plan.order,
    });
    setModal(plan._id);
  };

  const handleSave = async () => {
    const payload = { ...form, amount: Number(form.amount), order: Number(form.order) };
    try {
      if (modal === 'create') await dataPlansApi.create(payload);
      else await dataPlansApi.update(modal, payload);
      setModal(null);
      fetchPlans();
      dialog.notifySuccess(modal === 'create' ? 'Data plan created' : 'Data plan updated');
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    }
  };

  const handleDelete = async (id) => {
    const ok = await dialog.confirm({
      title: 'Delete Data Plan',
      message: 'Delete this data plan?',
      confirmText: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await dataPlansApi.delete(id);
      fetchPlans();
      dialog.notifySuccess('Data plan deleted');
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    }
  };

  const toggleEnabled = async (plan) => {
    try {
      await dataPlansApi.update(plan._id, { enabled: !plan.enabled });
      fetchPlans();
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    }
  };

  const columns = [
    { key: 'network', label: 'Network', render: (r) => <span className="uppercase font-bold">{r.network}</span> },
    { key: 'name', label: 'Plan' },
    { key: 'dataSize', label: 'Data' },
    { key: 'validity', label: 'Validity' },
    { key: 'amount', label: 'Price', render: (r) => formatCurrency(r.amount) },
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
        title="Data Plans"
        subtitle="Manage data bundles shown in the user app"
        action={
          <button type="button" onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white">
            <Plus size={18} /> Add Plan
          </button>
        }
      />

      <div className="mb-4 flex gap-2">
        <button type="button" onClick={() => setNetwork('')} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${!network ? 'bg-primary text-white' : 'bg-slate-100'}`}>All</button>
        {NETWORKS.map((n) => (
          <button key={n} type="button" onClick={() => setNetwork(n)} className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase ${network === n ? 'bg-primary text-white' : 'bg-slate-100'}`}>{n}</button>
        ))}
      </div>

      {loading ? <PageLoader /> : <DataTable columns={columns} data={plans} />}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add Data Plan' : 'Edit Data Plan'}>
        <div className="space-y-3">
          <select value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })} className="w-full rounded-xl border border-slate-200 p-3 text-sm">
            {NETWORKS.map((n) => <option key={n} value={n}>{n.toUpperCase()}</option>)}
          </select>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Plan name" className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
          <input value={form.dataSize} onChange={(e) => setForm({ ...form, dataSize: e.target.value })} placeholder="Data size (e.g. 1GB)" className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
          <input value={form.validity} onChange={(e) => setForm({ ...form, validity: e.target.value })} placeholder="Validity (e.g. 30 days)" className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
          <input value={form.variationCode} onChange={(e) => setForm({ ...form, variationCode: e.target.value })} placeholder="VTpass variation code" className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
          <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Price (₦)" className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
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

export default DataPlansPage;
