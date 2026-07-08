import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader, DataTable, Modal, PageLoader, ErrorAlert } from '../components';
import { educationProductsApi, getErrorMessage } from '../services/adminService';
import { formatCurrency } from '../utils/formatters';
import { useDialog } from '../hooks/useDialog';
import { useVtuProvider } from '../hooks/useVtuProvider';

const EXAM_TYPES = ['waec', 'neco', 'jamb'];
const emptyForm = {
  examType: 'waec',
  productCode: '',
  name: '',
  providerServiceId: '',
  altServiceId: '',
  amount: '',
  enabled: true,
  order: 0,
};

const EducationProductsPage = () => {
  const dialog = useDialog();
  const { selected, label, otherLabel, showBoth, serviceIdLabel, refresh } = useVtuProvider();
  const [products, setProducts] = useState([]);
  const [examType, setExamType] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);

  const fetchProducts = useCallback(() => {
    setLoading(true);
    educationProductsApi.list(examType ? { examType } : {})
      .then((res) => setProducts(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [examType]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const openCreate = async () => {
    await refresh();
    setForm({ ...emptyForm, examType: examType || 'waec' });
    setModal('create');
  };

  const serviceIdForActive = (product) => (
    selected === 'vtpass'
      ? (product.vtpassServiceId || product.providerServiceId || '')
      : (product.providerServiceId || product.vtpassServiceId || '')
  );

  const openEdit = async (product) => {
    await refresh();
    setForm({
      examType: product.examType,
      productCode: product.productCode,
      name: product.name,
      providerServiceId: serviceIdForActive(product),
      altServiceId: selected === 'vtpass' ? (product.providerServiceId || '') : (product.vtpassServiceId || ''),
      amount: product.amount,
      enabled: product.enabled,
      order: product.order ?? 0,
    });
    setModal(product._id);
  };

  const handleSave = async () => {
    const payload = {
      ...form,
      amount: Number(form.amount),
      order: Number(form.order || 0),
    };
    delete payload.altServiceId;
    try {
      if (modal === 'create') await educationProductsApi.create(payload);
      else await educationProductsApi.update(modal, payload);
      setModal(null);
      fetchProducts();
      dialog.notifySuccess(modal === 'create' ? 'Education product created' : 'Education product updated');
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    }
  };

  const handleDelete = async (id) => {
    const ok = await dialog.confirm({
      title: 'Delete Product',
      message: 'Delete this education product?',
      confirmText: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await educationProductsApi.delete(id);
      fetchProducts();
      dialog.notifySuccess('Education product deleted');
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    }
  };

  const columns = [
    { key: 'examType', label: 'Exam', render: (r) => r.examType?.toUpperCase() },
    { key: 'name', label: 'Name' },
    { key: 'productCode', label: 'Code' },
    { key: 'providerServiceId', label: 'Service ID', render: (r) => serviceIdForActive(r) || '—' },
    { key: 'amount', label: 'Amount', render: (r) => formatCurrency(r.amount) },
    { key: 'enabled', label: 'Status', render: (r) => (r.enabled ? 'Enabled' : 'Disabled') },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <div className="flex gap-2">
          <button type="button" onClick={(e) => { e.stopPropagation(); openEdit(r); }} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><Pencil size={16} /></button>
          <button type="button" onClick={(e) => { e.stopPropagation(); handleDelete(r._id); }} className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
        </div>
      ),
    },
  ];

  if (error) return <ErrorAlert message={error} />;

  return (
    <div>
      <PageHeader
        title="Education Products"
        subtitle={`Manage WAEC, NECO, and JAMB pin products · selected provider: ${label}`}
        action={(
          <button type="button" onClick={openCreate} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white">
            <Plus size={18} /> Add Product
          </button>
        )}
      />

      <div className="mb-4 flex gap-2">
        <button type="button" onClick={() => setExamType('')} className={`rounded-xl px-4 py-2 text-sm font-semibold ${!examType ? 'bg-primary text-white' : 'bg-white text-slate-600'}`}>All</button>
        {EXAM_TYPES.map((type) => (
          <button key={type} type="button" onClick={() => setExamType(type)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${examType === type ? 'bg-primary text-white' : 'bg-white text-slate-600'}`}>{type.toUpperCase()}</button>
        ))}
      </div>

      {loading ? <PageLoader /> : <DataTable columns={columns} data={products} />}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add Education Product' : 'Edit Education Product'}>
        <div className="space-y-3">
          <select value={form.examType} onChange={(e) => setForm({ ...form, examType: e.target.value })} className="w-full rounded-xl border px-4 py-2.5 text-sm">
            {EXAM_TYPES.map((type) => <option key={type} value={type}>{type.toUpperCase()}</option>)}
          </select>
          {['productCode', 'name', 'amount', 'order'].map((field) => (
            <input key={field} value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} placeholder={field} className="w-full rounded-xl border px-4 py-2.5 text-sm" />
          ))}
          <input value={form.providerServiceId} onChange={(e) => setForm({ ...form, providerServiceId: e.target.value })} placeholder={serviceIdLabel} className="w-full rounded-xl border px-4 py-2.5 text-sm" />
          {showBoth && (
            <input value={form.altServiceId} onChange={(e) => setForm({ ...form, altServiceId: e.target.value })} placeholder={`${otherLabel} service ID (optional)`} className="w-full rounded-xl border px-4 py-2.5 text-sm" />
          )}
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

export default EducationProductsPage;
