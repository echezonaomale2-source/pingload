import { useState, useEffect, useCallback } from 'react';
import { ImageIcon } from 'lucide-react';
import { PageHeader, DataTable, PageLoader, ErrorAlert } from '../components';
import { providerLogosApi, getErrorMessage } from '../services/adminService';
import { useDialog } from '../hooks/useDialog';

const PAGE_SIZE = 25;

const ProviderLogosPage = () => {
  const dialog = useDialog();
  const [logos, setLogos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);

  const fetchLogos = useCallback(() => {
    setLoading(true);
    providerLogosApi.list()
      .then((res) => setLogos(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchLogos(); }, [fetchLogos]);

  const handleToggle = async (logo) => {
    setSavingId(logo._id);
    try {
      await providerLogosApi.update(logo._id, { enabled: !logo.enabled });
      fetchLogos();
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  };

  const handleClear = async (logo) => {
    const ok = await dialog.confirm({
      title: 'Remove Logo',
      message: `Remove custom logo for ${logo.name}?`,
      confirmText: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    try {
      await providerLogosApi.remove(logo._id);
      fetchLogos();
      dialog.notifySuccess('Logo removed');
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    }
  };

  const columns = [
    {
      key: 'logo',
      label: 'Logo',
      render: (r) => r.logoUri ? (
        <img src={r.logoUri} alt={r.name} className="h-10 w-10 rounded-lg object-contain bg-slate-50" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
          <ImageIcon size={18} />
        </div>
      ),
    },
    { key: 'name', label: 'Provider' },
    { key: 'providerId', label: 'ID' },
    { key: 'category', label: 'Category' },
    {
      key: 'enabled',
      label: 'Enabled',
      render: (r) => (
        <button
          type="button"
          disabled={savingId === r._id}
          onClick={() => handleToggle(r)}
          className={`rounded-full px-3 py-1 text-xs font-bold ${r.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
        >
          {r.enabled ? 'Yes' : 'No'}
        </button>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <button type="button" onClick={() => handleClear(r)} className="text-sm font-semibold text-red-500 hover:underline">
          Clear logo
        </button>
      ),
    },
  ];

  if (error) return <ErrorAlert message={error} />;

  return (
    <div>
      <PageHeader title="Provider Logos" subtitle="Manage network and service provider logos shown in the app" />
      {loading ? <PageLoader /> : <DataTable columns={columns} data={logos} pageSize={PAGE_SIZE} />}
    </div>
  );
};

export default ProviderLogosPage;
