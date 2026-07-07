import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, RefreshCw } from 'lucide-react';
import { PageHeader, DataTable, Modal, PageLoader, ErrorAlert } from '../components';
import { dataPlansApi, getErrorMessage } from '../services/adminService';
import { formatCurrency } from '../utils/formatters';
import { useDialog } from '../hooks/useDialog';
import { useVtuProvider } from '../hooks/useVtuProvider';

const NETWORKS = ['mtn', 'airtel', 'glo', '9mobile'];
const VALIDITY_CATEGORIES = ['daily', 'weekly', 'monthly', 'yearly', 'other'];
const emptyForm = {
  network: 'mtn', name: '', dataSize: '', validity: '', validityCategory: 'other', category: '',
  variationCode: '', altVariationCode: '', amount: '', commissionPercent: 0, enabled: true, order: 0,
  vtuProvider: 'clubkonnect',
};

const DataPlansPage = () => {
  const dialog = useDialog();
  const { selected, label, otherLabel, showBoth, codeLabelForProvider, activeProviders, refresh } = useVtuProvider();
  const [plans, setPlans] = useState([]);
  const [network, setNetwork] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [syncing, setSyncing] = useState(false);

  const fetchPlans = useCallback(() => {
    setLoading(true);
    const params = {};
    if (network) params.network = network;
    if (providerFilter) params.provider = providerFilter;
    dataPlansApi.list(params)
      .then((res) => setPlans(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [network, providerFilter]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  useEffect(() => { setPage(1); }, [network, providerFilter]);

  const formProvider = form.vtuProvider || selected;
  const variationCodeLabel = codeLabelForProvider(formProvider);

  const openCreate = async () => {
    await refresh();
    setForm({ ...emptyForm, network: network || 'mtn', vtuProvider: providerFilter || selected });
    setModal('create');
  };
  const planCodeForProvider = (plan, providerId = plan.vtuProvider || selected) => (
    providerId === 'vtpass'
      ? (plan.vtpassVariationCode || plan.variationCode || '')
      : (plan.planCode || plan.variationCode || plan.vtpassVariationCode || '')
  );

  const openEdit = async (plan) => {
    await refresh();
    const planProvider = plan.vtuProvider || selected;
    setForm({
      network: plan.network,
      name: plan.name,
      dataSize: plan.dataSize,
      validity: plan.validity,
      validityCategory: plan.validityCategory || 'other',
      category: plan.category || '',
      variationCode: planCodeForProvider(plan, planProvider),
      altVariationCode: planProvider === 'vtpass' ? (plan.planCode || plan.variationCode || '') : (plan.vtpassVariationCode || ''),
      amount: plan.amount,
      commissionPercent: plan.commissionPercent ?? 0,
      enabled: plan.enabled,
      order: plan.order,
      vtuProvider: planProvider,
    });
    setModal(plan._id);
  };

  const handleSave = async () => {
    const payload = {
      amount: Number(form.amount),
      commissionPercent: Number(form.commissionPercent || 0),
      order: Number(form.order),
      name: form.name,
      dataSize: form.dataSize,
      validity: form.validity,
      validityCategory: form.validityCategory,
      category: form.category,
      enabled: form.enabled,
    };
    if (modal === 'create') {
      payload.network = form.network;
      payload.vtuProvider = form.vtuProvider || selected;
      payload.variationCode = form.variationCode;
    }
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

  const handleSync = async () => {
    setSyncing(true);
    try {
      const params = {};
      if (network) params.network = network;
      if (providerFilter) params.source = providerFilter;
      const res = await dataPlansApi.sync(params);
      const source = res.data.data?.source ? ` from ${res.data.data.source}` : '';
      dialog.notifySuccess(`Synced ${res.data.data?.synced || 0} data plan(s)${source}`);
      fetchPlans();
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    } finally {
      setSyncing(false);
    }
  };

  const columns = [
    { key: 'vtuProvider', label: 'Provider', render: (r) => <span className="font-semibold">{r.vtuProvider === 'vtpass' ? 'VTpass' : 'Clubkonnect'}</span> },
    { key: 'network', label: 'Network', render: (r) => <span className="uppercase font-bold">{r.network}</span> },
    { key: 'name', label: 'Plan' },
    { key: 'dataSize', label: 'Data' },
    { key: 'validity', label: 'Validity' },
    { key: 'validityCategory', label: 'Group', render: (r) => r.validityCategory || 'other' },
    { key: 'category', label: 'Category' },
    {
      key: 'providerPlanCode',
      label: 'Plan Code',
      render: (r) => (
        <span className="font-mono text-xs">
          {r.providerPlanCode || planCodeForProvider(r)}
        </span>
      ),
    },
    { key: 'amount', label: 'Price', render: (r) => formatCurrency(r.amount) },
    { key: 'commissionPercent', label: 'Commission', render: (r) => `${r.commissionPercent || 0}%` },
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
        title="Data Plans"
        subtitle={`${plans.length} plan${plans.length === 1 ? '' : 's'}${network ? ` · ${network.toUpperCase()}` : ''}${providerFilter ? ` · ${providerFilter}` : showBoth ? ' · all providers' : ` · ${label}`}`}
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

      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => setProviderFilter('')} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${!providerFilter ? 'bg-secondary text-white' : 'bg-slate-100'}`}>All Providers</button>
        {(activeProviders.length ? activeProviders : ['clubkonnect', 'vtpass']).map((p) => (
          <button key={p} type="button" onClick={() => setProviderFilter(p)} className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize ${providerFilter === p ? 'bg-secondary text-white' : 'bg-slate-100'}`}>{p}</button>
        ))}
      </div>

      <div className="mb-4 flex gap-2">
        <button type="button" onClick={() => setNetwork('')} className={`rounded-lg px-3 py-1.5 text-xs font-bold ${!network ? 'bg-primary text-white' : 'bg-slate-100'}`}>All</button>
        {NETWORKS.map((n) => (
          <button key={n} type="button" onClick={() => setNetwork(n)} className={`rounded-lg px-3 py-1.5 text-xs font-bold uppercase ${network === n ? 'bg-primary text-white' : 'bg-slate-100'}`}>{n}</button>
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

      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'Add Data Plan' : 'Edit Data Plan'}
        scrollBody
        compact
        footer={
          <button type="button" onClick={handleSave} className="w-full rounded-xl bg-primary py-2 text-sm font-bold text-white">
            {modal === 'create' ? 'Save Plan' : 'Update Plan'}
          </button>
        }
      >
        <div className="space-y-2">
          {modal !== 'create' && (
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Provider: <strong>{form.vtuProvider === 'vtpass' ? 'VTpass' : 'Clubkonnect'}</strong>
              {' · '}Plan code: <strong className="font-mono">{form.variationCode}</strong>
            </div>
          )}
          {modal === 'create' && (
            <select value={form.vtuProvider} onChange={(e) => setForm({ ...form, vtuProvider: e.target.value, variationCode: '' })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {(activeProviders.length ? activeProviders : ['clubkonnect', 'vtpass']).map((p) => (
                <option key={p} value={p}>{p === 'vtpass' ? 'VTpass' : 'Clubkonnect'}</option>
              ))}
            </select>
          )}
          <select value={form.network} onChange={(e) => setForm({ ...form, network: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {NETWORKS.map((n) => <option key={n} value={n}>{n.toUpperCase()}</option>)}
          </select>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Plan name" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input value={form.dataSize} onChange={(e) => setForm({ ...form, dataSize: e.target.value })} placeholder="Data size (e.g. 1GB)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input value={form.validity} onChange={(e) => setForm({ ...form, validity: e.target.value })} placeholder="Validity (e.g. 30 days)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <select value={form.validityCategory} onChange={(e) => setForm({ ...form, validityCategory: e.target.value })} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
            {VALIDITY_CATEGORIES.map((v) => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
          </select>
          <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category (optional)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          {modal === 'create' ? (
            <input value={form.variationCode} onChange={(e) => setForm({ ...form, variationCode: e.target.value })} placeholder={variationCodeLabel} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          ) : null}
          <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Price (₦)" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input type="number" value={form.commissionPercent} onChange={(e) => setForm({ ...form, commissionPercent: e.target.value })} placeholder="Commission %" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <input type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} placeholder="Display order" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
            Enabled
          </label>
        </div>
      </Modal>
    </div>
  );
};

export default DataPlansPage;
