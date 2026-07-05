import { useState, useEffect, useCallback } from 'react';
import { RefreshCw } from 'lucide-react';
import { PageHeader, DataTable, PageLoader, ErrorAlert } from '../components';
import { bettingPlatformsApi, getErrorMessage } from '../services/adminService';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useDialog } from '../hooks/useDialog';

const BettingPlatformsPage = () => {
  const dialog = useDialog();
  const [platforms, setPlatforms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');

  const fetchPlatforms = useCallback(() => {
    setLoading(true);
    bettingPlatformsApi.list()
      .then((res) => setPlatforms(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchPlatforms(); }, [fetchPlatforms]);

  const handleToggle = async (platform) => {
    try {
      await bettingPlatformsApi.update(platform.platformId, { enabled: !platform.enabled });
      fetchPlatforms();
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await bettingPlatformsApi.sync();
      dialog.notifySuccess(`Synced ${res.data.data?.synced || 0} platform(s) from VTpass`);
      fetchPlatforms();
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    } finally {
      setSyncing(false);
    }
  };

  const columns = [
    { key: 'platformId', label: 'ID' },
    { key: 'name', label: 'Name' },
    { key: 'vtpassServiceId', label: 'VTpass Service ID', render: (r) => r.vtpassServiceId || '—' },
    {
      key: 'limits',
      label: 'Limits',
      render: (r) => `${formatCurrency(r.minAmount)} – ${formatCurrency(r.maxAmount)}`,
    },
    {
      key: 'enabled',
      label: 'Enabled',
      render: (r) => (
        <button type="button" onClick={() => handleToggle(r)} className={`rounded-full px-3 py-1 text-xs font-bold ${r.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
          {r.enabled ? 'Yes' : 'No'}
        </button>
      ),
    },
    {
      key: 'lastSyncedAt',
      label: 'Last Synced',
      render: (r) => (r.lastSyncedAt ? formatDate(r.lastSyncedAt) : '—'),
    },
  ];

  if (error) return <ErrorAlert message={error} />;

  return (
    <div>
      <PageHeader
        title="Betting Platforms"
        subtitle="VTpass betting wallet funding platforms"
        action={(
          <button type="button" onClick={handleSync} disabled={syncing} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
            <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} /> Sync from VTpass
          </button>
        )}
      />

      {loading ? <PageLoader /> : <DataTable columns={columns} data={platforms} />}
    </div>
  );
};

export default BettingPlatformsPage;
