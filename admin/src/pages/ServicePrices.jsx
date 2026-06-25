import { useState, useEffect } from 'react';
import { PageHeader, PageLoader, ErrorAlert } from '../components';
import { pricesApi, getErrorMessage } from '../services/adminService';
import { useDialog } from '../hooks/useDialog';

const ServicePricesPage = () => {
  const dialog = useDialog();
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(null);

  const fetchPrices = () => {
    pricesApi.list()
      .then((res) => setPrices(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPrices(); }, []);

  const updateField = (serviceId, field, value) => {
    setPrices((prev) => prev.map((p) => (p.serviceId === serviceId ? { ...p, [field]: value } : p)));
  };

  const save = async (serviceId) => {
    setSaving(serviceId);
    const item = prices.find((p) => p.serviceId === serviceId);
    try {
      const res = await pricesApi.update(serviceId, {
        discountPercent: Number(item.discountPercent),
        markupPercent: Number(item.markupPercent),
        minAmount: Number(item.minAmount),
        maxAmount: Number(item.maxAmount),
      });
      setPrices((prev) => prev.map((p) => (p.serviceId === serviceId ? res.data.data : p)));
      dialog.notifySuccess('Pricing saved');
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorAlert message={error} />;

  return (
    <div>
      <PageHeader title="Service Pricing" subtitle="Set discounts and markup for each service category" />

      <div className="grid gap-4">
        {prices.map((p) => (
          <div key={p.serviceId} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h3 className="text-base font-bold text-slate-800">{p.name}</h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-sm">
                <span className="text-slate-500">Discount %</span>
                <input type="number" min="0" max="100" value={p.discountPercent} onChange={(e) => updateField(p.serviceId, 'discountPercent', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
              </label>
              <label className="text-sm">
                <span className="text-slate-500">Markup %</span>
                <input type="number" min="0" value={p.markupPercent} onChange={(e) => updateField(p.serviceId, 'markupPercent', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
              </label>
              <label className="text-sm">
                <span className="text-slate-500">Min Amount (₦)</span>
                <input type="number" min="0" value={p.minAmount} onChange={(e) => updateField(p.serviceId, 'minAmount', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
              </label>
              <label className="text-sm">
                <span className="text-slate-500">Max Amount (₦)</span>
                <input type="number" min="0" value={p.maxAmount} onChange={(e) => updateField(p.serviceId, 'maxAmount', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
              </label>
            </div>
            <button type="button" disabled={saving === p.serviceId} onClick={() => save(p.serviceId)} className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white">
              {saving === p.serviceId ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServicePricesPage;
