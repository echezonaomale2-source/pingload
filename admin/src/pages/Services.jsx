import { useState, useEffect } from 'react';
import { PageHeader, PageLoader, ErrorAlert } from '../components';
import { servicesApi, getErrorMessage } from '../services/adminService';
import { useDialog } from '../hooks/useDialog';

const ServicesPage = () => {
  const dialog = useDialog();
  const [serviceList, setServiceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchServices = () => {
    servicesApi.list()
      .then((res) => setServiceList(res.data.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchServices(); }, []);

  const toggle = async (id, enabled) => {
    try {
      const res = await servicesApi.toggle(id, !enabled);
      setServiceList(res.data.data);
    } catch (err) {
      dialog.notifyError(getErrorMessage(err));
    }
  };

  if (loading) return <PageLoader />;
  if (error) return <ErrorAlert message={error} />;

  return (
    <div>
      <PageHeader title="Service Management" subtitle="Enable or disable platform services" />

      <div className="grid gap-4 sm:grid-cols-2">
        {serviceList.map((service) => (
          <div key={service.id} className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex-1 pr-4">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-bold text-slate-800">{service.name}</h3>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${service.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                  {service.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">{service.description}</p>
            </div>
            <button
              type="button"
              onClick={() => toggle(service.id, service.enabled)}
              className={`relative h-7 w-12 rounded-full transition ${service.enabled ? 'bg-primary' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${service.enabled ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ServicesPage;
