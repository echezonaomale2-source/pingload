import { useCallback, useEffect, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import { PageHeader, DataTable, Modal, PageLoader, ErrorAlert } from '../components';
import { providerLogosApi, getErrorMessage } from '../services/adminService';
import { useDialog } from '../hooks/useDialog';

const ProviderLogosPage = () => {
  const dialog = useDialog();
  const [logos, setLogos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null);
  const [logoUrl, setLogoUrl] = useState('');
  const [logoData, setLogoData] = useState('');

  const fetchLogos = useCallback(() => {
    setLoading(true);
    providerLogosApi.list()
      .then((res) => setLogos(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchLogos(); }, [fetchLogos]);

  const openEdit = (logo) => {
    setEditing(logo);
    setLogoUrl(logo.logoUrl || '');
    setLogoData(logo.logoData || '');
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoData(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      await providerLogosApi.update(editing._id, {
        logoUrl: logoUrl || null,
        logoData: logoData || null,
      });
      setEditing(null);
      fetchLogos();
      dialog.notifySuccess('Provider logo updated');
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    }
  };

  const columns = [
    { key: 'name', label: 'Provider' },
    { key: 'category', label: 'Category', render: (r) => r.category },
    {
      key: 'logo',
      label: 'Logo',
      render: (r) => (
        r.logoData || r.logoUrl ? (
          <img src={r.logoData || r.logoUrl} alt={r.name} className="h-8 w-8 rounded object-contain" />
        ) : (
          <span className="text-xs text-slate-400">No logo</span>
        )
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (r) => (
        <button type="button" onClick={() => openEdit(r)} className="text-sm font-bold text-primary">
          Change
        </button>
      ),
    },
  ];

  if (error) return <ErrorAlert message={error} />;

  return (
    <div>
      <PageHeader title="Provider Logos" subtitle="Manage logos shown in the mobile app" />
      {loading ? <PageLoader /> : <DataTable columns={columns} data={logos} />}

      <Modal open={!!editing} onClose={() => setEditing(null)} title={`Update ${editing?.name} Logo`}>
        <div className="space-y-3">
          <input
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="Logo URL (optional)"
            className="w-full rounded-xl border border-slate-200 p-3 text-sm"
          />
          <input type="file" accept="image/*" onChange={handleFile} className="w-full text-sm" />
          {(logoData || logoUrl) && (
            <img src={logoData || logoUrl} alt="Preview" className="mx-auto h-16 w-16 object-contain" />
          )}
          <button type="button" onClick={handleSave} className="w-full rounded-xl bg-primary py-2.5 text-sm font-bold text-white">
            Save Logo
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default ProviderLogosPage;
