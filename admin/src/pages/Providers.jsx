import { useState, useEffect, useCallback } from 'react';
import { Server, RefreshCw, Zap, CheckCircle2, AlertCircle, Database, Wallet } from 'lucide-react';
import { PageHeader, PageLoader, ErrorAlert } from '../components';
import { providersApi, getErrorMessage } from '../services/adminService';
import { useDialog } from '../hooks/useDialog';
import { formatCurrency } from '../utils/formatters';

const healthBadge = (status) => {
  if (status === 'healthy') return 'bg-emerald-100 text-emerald-700';
  if (status === 'degraded') return 'bg-amber-100 text-amber-800';
  if (status === 'down') return 'bg-red-100 text-red-700';
  return 'bg-slate-100 text-slate-600';
};

const ProvidersPage = () => {
  const dialog = useDialog();
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await providersApi.get();
      setSnapshot(res.data.data);
      setError('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const runAction = async (key, action, successMsg) => {
    setBusy(key);
    try {
      await action();
      await load();
      if (successMsg) dialog.notifySuccess(successMsg);
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    } finally {
      setBusy('');
    }
  };

  const toggleDataProvider = (enabled) => runAction(
    'data-vtpass',
    () => providersApi.setDataEnabled('vtpass', enabled),
    `VTpass data ${enabled ? 'enabled' : 'disabled'}`
  );

  const testConnection = () => runAction(
    'test-vtpass',
    async () => {
      const res = await providersApi.test('vtpass');
      if (!res.data.success) throw new Error(res.data.data?.message || 'Connection test failed');
      dialog.notifySuccess(res.data.data?.message || 'Connection successful');
    }
  );

  const syncData = () => runAction(
    'sync-data-vtpass',
    () => providersApi.syncData('vtpass'),
    'VTpass data plans synced'
  );

  if (loading) return <PageLoader />;
  if (error) return <ErrorAlert message={error} />;
  if (!snapshot) return null;

  const provider = snapshot.providers[0] || {
    providerId: 'vtpass',
    displayName: 'VTpass',
    configured: false,
    dataEnabled: false,
    healthStatus: 'unknown',
  };

  return (
    <div>
      <PageHeader
        title="VTpass Provider"
        subtitle="All VTU services (airtime, data, electricity, TV, exam pins, betting) are fulfilled through VTpass."
        action={(
          <button
            type="button"
            disabled={Boolean(busy) || !provider.configured}
            onClick={syncData}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            <RefreshCw size={16} className={busy === 'sync-data-vtpass' ? 'animate-spin' : ''} />
            Sync VTpass Data Plans
          </button>
        )}
      />

      <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800">
          <Database size={18} className="text-primary" />
          Data Catalog
        </h3>
        <p className="mb-4 text-xs text-slate-500">
          VTpass is the sole provider. Sync plans after updating your VTpass account or whitelisting server IP.
        </p>
        <div className="rounded-xl border border-slate-100 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="font-bold text-slate-800">{provider.displayName}</p>
              <p className="text-xs text-slate-500">
                {provider.configured ? 'Configured' : 'Not configured'}
                {provider.lastSyncAt ? ` · Last sync ${new Date(provider.lastSyncAt).toLocaleString()}` : ''}
              </p>
            </div>
            <button
              type="button"
              disabled={!provider.configured || Boolean(busy)}
              onClick={() => toggleDataProvider(!provider.dataEnabled)}
              className={`relative h-7 w-12 rounded-full transition ${provider.dataEnabled ? 'bg-primary' : 'bg-slate-300'} disabled:opacity-50`}
            >
              <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${provider.dataEnabled ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
          <p className="mb-3 text-xs font-semibold text-slate-600">
            Enable VTpass Data: {provider.dataEnabled ? 'ON' : 'OFF'}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!provider.configured || Boolean(busy)} onClick={testConnection} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">Test Connection</button>
            <button type="button" disabled={!provider.configured || Boolean(busy)} onClick={syncData} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">Sync Data Plans</button>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
            <Server size={16} className="text-primary" />
            VTpass Status
          </h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Health</p>
              <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-bold uppercase ${healthBadge(provider.healthStatus)}`}>{provider.healthStatus}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Credentials</p>
              <p className="mt-1 font-medium text-slate-700">{provider.configured ? 'Ready' : 'Missing'}</p>
            </div>
            {snapshot.vtpassBalance != null && (
              <div className="col-span-2 rounded-xl bg-slate-50 p-3">
                <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <Wallet size={12} />
                  Wallet Balance
                </p>
                <p className="mt-1 text-lg font-bold text-slate-800">{formatCurrency(snapshot.vtpassBalance)}</p>
              </div>
            )}
          </div>
          {provider.lastHealthMessage && (
            <p className="mt-3 text-xs text-slate-500">{provider.lastHealthMessage}</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
            <Zap size={16} className="text-amber-500" />
            Service Routing
          </h3>
          <p className="mb-3 text-xs text-slate-500">All services route to VTpass automatically.</p>
          <ul className="space-y-2 text-sm text-slate-700">
            {Object.entries(snapshot.serviceRouting || {}).map(([service, route]) => (
              <li key={service} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2 capitalize">
                <span>{service}</span>
                <span className="font-semibold text-primary">{route === 'vtpass' ? 'VTpass' : route}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <CheckCircle2 size={14} className="mt-0.5 text-emerald-600" />
          <span>Catalog version: <strong>{snapshot.catalogVersion}</strong>. Data plan changes appear in the app after refresh.</span>
        </div>
        {!provider.configured && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertCircle size={14} className="mt-0.5" />
            <span>Set VTPASS_API_KEY, VTPASS_PUBLIC_KEY, and VTPASS_SECRET_KEY on the server to enable purchases.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProvidersPage;
