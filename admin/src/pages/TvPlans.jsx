import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { PageHeader, DataTable, Modal, PageLoader, ErrorAlert } from '../components';
import { tvPlansApi, getErrorMessage } from '../services/adminService';
import { formatCurrency } from '../utils/formatters';
import { useDialog } from '../hooks/useDialog';
import { useVtuProvider } from '../hooks/useVtuProvider';

const PROVIDERS = ['dstv', 'gotv', 'startimes'];
const emptyForm = { provider: 'dstv', name: '', variationCode: '', altVariationCode: '', amount: '', enabled: true, order: 0 };

const TvPlansPage = () => {
  const dialog = useDialog();
  const { selected, label, otherLabel, showBoth, variationCodeLabel, refresh } = useVtuProvider();
  const [plans, setPlans] = useState([]);
  const [provider, setProvider] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [syncing, setSyncing] = useState(false);

  const fetchPlans = useCallback(() => {
    setLoading(true);
    tvPlansApi.list(provider ? { provider } : {})
      .then((res) => setPlans(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [provider]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  useEffect(() => { setPage(1); }, [provider]);

  const openCreate = async () => {
    await refresh();
    setForm({ ...emptyForm, provider: provider || 'dstv' });
    setModal('create');
  };
  const planCodeForActive = (plan) => (
    selected === 'vtpass'
      ? (plan.vtpassVariationCode || plan.variationCode || '')
      : (plan.variationCode || plan.vtpassVariationCode || '')
  );

  const openEdit = async (plan) => {
    await refresh();
    setForm({
      provider: plan.provider,
      name: plan.name,
      variationCode: planCodeForActive(plan),
      altVariationCode: selected === 'vtpass' ? (plan.variationCode || '') : (plan.vtpassVariationCode || ''),
      amount: plan.amount,
      enabled: plan.enabled,
      order: plan.order,
    });
    setModal(plan._id);
  };

  const handleSave = async () => {
    const payload = { ...form, amount: Number(form.amount), order: Number(form.order) };
    delete payload.altVariationCode;
    try {
      if (modal === 'create') await tvPlansApi.create(payload);
      else await tvPlansApi.update(modal, payload);
      setModal(null);
      fetchPlans();
      dialog.notifySuccess(modal === 'create' ? 'TV plan created' : 'TV plan updated');
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    }
  };

  const handleDelete = async (id) => {
    const ok = await dialog.confirm({
      title: 'Delete TV Plan',
      message: 'Delete this TV subscription plan?',
      confirmText: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await tvPlansApi.delete(id);
      fetchPlans();
      dialog.notifySuccess('TV plan deleted');
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    }
  };

  const toggleEnabled = async (plan) => {
    try {
      await tvPlansApi.update(plan._id, { enabled: !plan.enabled });
      fetchPlans();
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await tvPlansApi.sync(provider ? { provider } : {});
      const source = res.data.data?.source ? ` from ${res.data.data.source}` : '';
      dialog.notifySuccess(`Synced ${res.data.data?.synced || 0} TV plan(s)${source}`);
      fetchPlans();
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    } finally {
      setSyncing(false);
    }
  };

  const columns = [
    { key: 'provider', label: 'Provider', render: (r) => <span className="uppercase font-bold">{r.provider}</span> },
    { key: 'name', label: 'Bouquet' },
    { key: 'variationCode', label: 'Code', render: (r) => <span className="font-mono text-xs">{planCodeForActive(r)}</span> },
    { key: 'amount', label: 'Price', render: (r) => formatCurrency(r.amount) },
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
        title="TV Plans"
        subtitle={`Manage DStv, GOtv, and StarTimes bouquets · selected provider: ${label}`}
        action={(
          <div className="flex gap-2">
            <button type="button" onClick={handleSync} disabled={syncing} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 disabled:opacity-60">
              <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} /> Sync Plans
            </button>
            <button type="button" onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white">
              <Plus size={18} /> Add Plan
            </button>
          </div>
        )}
      />

      <div className="mb-4 flex gap-2">
        <button type="button" onClick={() => setProvider('')} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${!provider ? 'bg-primary text-white' : 'bg-slate-100'}`}>All</button>
        {PROVIDERS.map((p) => (
          <button key={p} type="button" onClick={() => setProvider(p)} className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase ${provider === p ? 'bg-primary text-white' : 'bg-slate-100'}`}>{p}</button>
        ))}
      </div>

      {loading ? <PageLoader /> : (
        <DataTable
          columns={columns}
          data={plans}
          page={page}
          pageSize={25}
          onPageChange={setPage}
        />
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add TV Plan' : 'Edit TV Plan'}>
        <div className="space-y-3">
          <select value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} className="w-full rounded-xl border border-slate-200 p-3 text-sm">
            {PROVIDERS.map((p) => <option key={p} value={p}>{p.toUpperCase()}</option>)}
          </select>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Bouquet name" className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
          <input value={form.variationCode} onChange={(e) => setForm({ ...form, variationCode: e.target.value })} placeholder={variationCodeLabel} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
          {showBoth && (
            <input value={form.altVariationCode} onChange={(e) => setForm({ ...form, altVariationCode: e.target.value })} placeholder={`${otherLabel} plan code (optional)`} className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
          )}
          <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Price (₦)" className="w-full rounded-xl border border-slate-200 p-3 text-sm" />
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

export default TvPlansPage;
