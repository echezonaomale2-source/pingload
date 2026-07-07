const VTU_PROVIDERS = ['clubkonnect', 'vtpass'];

const VTU_SERVICES = ['airtime', 'data', 'electricity', 'tv', 'betting', 'education'];

const PROVIDER_LABELS = {
  clubkonnect: 'Clubkonnect',
  vtpass: 'VTpass',
};

const SERVICE_LABELS = {
  airtime: 'Airtime',
  data: 'Data',
  electricity: 'Electricity',
  tv: 'TV Subscription',
  betting: 'Betting',
  education: 'Exam Pins',
};

const defaultServiceRouting = (provider = 'clubkonnect') => VTU_SERVICES.reduce((acc, service) => {
  acc[service] = provider;
  return acc;
}, {});

module.exports = {
  VTU_PROVIDERS,
  VTU_SERVICES,
  PROVIDER_LABELS,
  SERVICE_LABELS,
  defaultServiceRouting,
};
