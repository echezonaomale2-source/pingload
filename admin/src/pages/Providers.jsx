import { useState, useEffect, useCallback } from 'react';
import { Server, RefreshCw, Zap, Radio, CheckCircle2, AlertCircle, Database } from 'lucide-react';
import { PageHeader, PageLoader, ErrorAlert } from '../components';
import { providersApi, getErrorMessage } from '../services/adminService';
import { useDialog } from '../hooks/useDialog';

const PREFERRED_SERVICES = [
  { id: 'airtime', label: 'Preferred Airtime Provider' },
  { id: 'electricity', label: 'Preferred Electricity Provider' },
  { id: 'tv', label: 'Preferred Cable TV Provider' },
  { id: 'betting', label: 'Preferred Betting Provider' },
  { id: 'education', label: 'Preferred Exam Provider' },
];

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

  const toggleDataProvider = (providerId, enabled) => runAction(
    `data-${providerId}`,
    () => providersApi.setDataEnabled(providerId, enabled),
    `${providerId === 'vtpass' ? 'VTpass' : 'Clubkonnect'} data ${enabled ? 'enabled' : 'disabled'}`
  );

  const testConnection = (providerId) => runAction(
    `test-${providerId}`,
    async () => {
      const res = await providersApi.test(providerId);
      if (!res.data.success) throw new Error(res.data.data?.message || 'Connection test failed');
      dialog.notifySuccess(res.data.data?.message || 'Connection successful');
    }
  );

  const syncData = (providerId) => runAction(
    `sync-data-${providerId}`,
    () => providersApi.syncData(providerId),
    `${providerId === 'vtpass' ? 'VTpass' : 'Clubkonnect'} data plans synced`
  );

  const syncAllData = () => runAction('sync-all-data', () => providersApi.syncAllData(), 'All data providers synced');

  const updateRouting = (service, providerId) => runAction(
    `route-${service}`,
    () => providersApi.updateRouting({ [service]: providerId }),
    'Preferred provider updated'
  );

  const toggleFailover = () => runAction(
    'failover',
    () => providersApi.updateFailover({ enableProviderFailover: !snapshot.enableProviderFailover }),
    `Automatic failover ${snapshot.enableProviderFailover ? 'disabled' : 'enabled'}`
  );

  if (loading) return <PageLoader />;
  if (error) return <ErrorAlert message={error} />;
  if (!snapshot) return null;

  return (
    <div>
      <PageHeader
        title="Providers"
        subtitle="Data supports multiple providers. Other services use one preferred provider each."
        action={(
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={syncAllData}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            <RefreshCw size={16} className={busy === 'sync-all-data' ? 'animate-spin' : ''} />
            Sync All Data Providers
          </button>
        )}
      />

      <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800">
          <Database size={18} className="text-primary" />
          Data Providers
        </h3>
        <p className="mb-4 text-xs text-slate-500">
          Both VTpass and Clubkonnect can be enabled for data at the same time. Plans are stored separately per provider.
        </p>
        <div className="grid gap-4 lg:grid-cols-2">
          {snapshot.providers.map((provider) => (
            <div key={provider.providerId} className="rounded-xl border border-slate-100 p-4">
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
                  onClick={() => toggleDataProvider(provider.providerId, !provider.dataEnabled)}
                  className={`relative h-7 w-12 rounded-full transition ${provider.dataEnabled ? 'bg-primary' : 'bg-slate-300'} disabled:opacity-50`}
                >
                  <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${provider.dataEnabled ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
              <p className="mb-3 text-xs font-semibold text-slate-600">
                Enable {provider.displayName} Data: {provider.dataEnabled ? 'ON' : 'OFF'}
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={!provider.configured || Boolean(busy)} onClick={() => testConnection(provider.providerId)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">Test Connection</button>
                <button type="button" disabled={!provider.configured || Boolean(busy)} onClick={() => syncData(provider.providerId)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold">Sync {provider.displayName} Data</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
            <Radio size={18} className="text-secondary" />
            Preferred Providers (Non-Data Services)
          </h3>
          <p className="mt-1 text-xs text-slate-500">Airtime, electricity, TV, betting, and exam pins each use one provider.</p>
        </div>
        <div className="space-y-4">
          {PREFERRED_SERVICES.map(({ id, label }) => (
            <div key={id} className="flex flex-col gap-2 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-slate-800">{label}</p>
              <div className="flex gap-2">
                {['clubkonnect', 'vtpass'].map((providerId) => {
                  const configured = snapshot.providers.find((p) => p.providerId === providerId)?.configured;
                  const selected = snapshot.serviceRouting?.[id] === providerId;
                  return (
                    <button
                      key={providerId}
                      type="button"
                      disabled={!configured || Boolean(busy)}
                      onClick={() => updateRouting(id, providerId)}
                      className={`rounded-xl px-3 py-2 text-xs font-bold transition ${selected ? 'bg-primary text-white' : 'border border-slate-200 text-slate-700'} disabled:opacity-50`}
                    >
                      {providerId === 'vtpass' ? 'VTpass' : 'Clubkonnect'}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {snapshot.providers.map((provider) => (
          <div key={`${provider.providerId}-status`} className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800">
              <Server size={16} className="text-primary" />
              {provider.displayName} Status
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Health</p>
                <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${healthBadge(provider.healthStatus)}`}>{provider.healthStatus}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Credentials</p>
                <p className="mt-1 font-medium text-slate-700">{provider.configured ? 'Ready' : 'Missing'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
              <Zap size={18} className="text-amber-500" />
              Automatic Failover
            </h3>
            <p className="mt-1 text-xs text-slate-500">Retry failed non-data purchases on the alternate provider.</p>
          </div>
          <button type="button" disabled={Boolean(busy)} onClick={toggleFailover} className={`relative h-7 w-12 rounded-full transition ${snapshot.enableProviderFailover ? 'bg-primary' : 'bg-slate-300'}`}>
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${snapshot.enableProviderFailover ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {snapshot.enableProviderFailover ? <CheckCircle2 size={14} className="mt-0.5 text-emerald-600" /> : <AlertCircle size={14} className="mt-0.5 text-slate-400" />}
          <span>Catalog version: <strong>{snapshot.catalogVersion}</strong>. Data plan changes appear in the app after refresh.</span>
        </div>
      </div>
    </div>
  );
};

export default ProvidersPage;
