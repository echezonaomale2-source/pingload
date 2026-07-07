import { useState, useEffect, useCallback } from 'react';
import { Server, RefreshCw, Zap, Radio, CheckCircle2, AlertCircle } from 'lucide-react';
import { PageHeader, PageLoader, ErrorAlert } from '../components';
import { providersApi, getErrorMessage } from '../services/adminService';
import { useDialog } from '../hooks/useDialog';

const SERVICE_LABELS = {
  airtime: 'Airtime',
  data: 'Data',
  electricity: 'Electricity',
  tv: 'TV Subscription',
  betting: 'Betting',
  education: 'Exam Pins',
};

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

  const toggleProvider = (providerId, enabled) => runAction(
    `toggle-${providerId}`,
    () => providersApi.setEnabled(providerId, enabled),
    `${providerId === 'vtpass' ? 'VTpass' : 'Clubkonnect'} ${enabled ? 'enabled' : 'disabled'}`
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
    'Data plans synced'
  );

  const syncTv = (providerId) => runAction(
    `sync-tv-${providerId}`,
    () => providersApi.syncTv(providerId),
    'TV plans synced'
  );

  const syncAll = () => runAction('sync-all', () => providersApi.syncAll(), 'All provider catalogs synced');

  const updateRouting = (service, providerId) => runAction(
    `route-${service}`,
    () => providersApi.updateRouting({ [service]: providerId }),
    `${SERVICE_LABELS[service]} routing updated`
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
        subtitle="Manage VTpass and Clubkonnect independently with per-service routing"
        action={(
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={syncAll}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-dark disabled:opacity-60"
          >
            <RefreshCw size={16} className={busy === 'sync-all' ? 'animate-spin' : ''} />
            Sync Everything
          </button>
        )}
      />

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {snapshot.providers.map((provider) => (
          <div key={provider.providerId} className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-bold text-slate-800">
                  <Server size={18} className="text-primary" />
                  {provider.displayName}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Credentials: {provider.configured ? 'Configured (environment)' : 'Not configured'}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${provider.enabled && provider.configured ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                {provider.enabled && provider.configured ? 'Active' : provider.configured ? 'Inactive' : 'Unavailable'}
              </span>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Health</p>
                <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-bold ${healthBadge(provider.healthStatus)}`}>
                  {provider.healthStatus}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Last Sync</p>
                <p className="mt-1 font-medium text-slate-700">
                  {provider.lastSyncAt ? new Date(provider.lastSyncAt).toLocaleString() : 'Never'}
                </p>
              </div>
            </div>

            {provider.lastHealthMessage && (
              <p className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">{provider.lastHealthMessage}</p>
            )}

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!provider.configured || Boolean(busy)}
                onClick={() => toggleProvider(provider.providerId, !provider.enabled)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:border-primary/40 disabled:opacity-50"
              >
                {provider.enabled ? 'Disable' : 'Enable'}
              </button>
              <button
                type="button"
                disabled={!provider.configured || Boolean(busy)}
                onClick={() => testConnection(provider.providerId)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:border-primary/40 disabled:opacity-50"
              >
                Test Connection
              </button>
              <button
                type="button"
                disabled={!provider.configured || Boolean(busy)}
                onClick={() => syncData(provider.providerId)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:border-primary/40 disabled:opacity-50"
              >
                Sync Data Plans
              </button>
              <button
                type="button"
                disabled={!provider.configured || Boolean(busy)}
                onClick={() => syncTv(provider.providerId)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:border-primary/40 disabled:opacity-50"
              >
                Sync TV Plans
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
              <Radio size={18} className="text-secondary" />
              Service Routing
            </h3>
            <p className="mt-1 text-xs text-slate-500">Choose which provider handles each service when both are active.</p>
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(SERVICE_LABELS).map(([service, label]) => (
            <div key={service} className="flex flex-col gap-2 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-slate-800">{label}</p>
              <div className="flex gap-2">
                {['clubkonnect', 'vtpass'].map((providerId) => {
                  const configured = snapshot.providers.find((p) => p.providerId === providerId)?.configured;
                  const selected = snapshot.serviceRouting?.[service] === providerId;
                  return (
                    <button
                      key={providerId}
                      type="button"
                      disabled={!configured || Boolean(busy)}
                      onClick={() => updateRouting(service, providerId)}
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

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-slate-800">
              <Zap size={18} className="text-amber-500" />
              Automatic Failover
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              Retry failed purchases on the alternate provider and log every failover event.
            </p>
          </div>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={toggleFailover}
            className={`relative h-7 w-12 rounded-full transition ${snapshot.enableProviderFailover ? 'bg-primary' : 'bg-slate-300'}`}
          >
            <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${snapshot.enableProviderFailover ? 'left-5' : 'left-0.5'}`} />
          </button>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
          {snapshot.enableProviderFailover ? <CheckCircle2 size={14} className="mt-0.5 text-emerald-600" /> : <AlertCircle size={14} className="mt-0.5 text-slate-400" />}
          <span>
            Catalog version: <strong>{snapshot.catalogVersion}</strong>. Plan changes bump this version so apps can refresh without a manual reload.
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProvidersPage;
