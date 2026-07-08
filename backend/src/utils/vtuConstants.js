const VTU_PROVIDERS = ['vtpass'];

const VTU_SERVICES = ['airtime', 'data', 'electricity', 'tv', 'betting', 'education'];
const NON_DATA_SERVICES = ['airtime', 'electricity', 'tv', 'betting', 'education'];

const PROVIDER_LABELS = {
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

const defaultServiceRouting = (provider = 'vtpass') => VTU_SERVICES.reduce((acc, service) => {
  acc[service] = provider;
  return acc;
}, {});

const PREFERRED_SERVICE_LABELS = {
  airtime: 'Preferred Airtime Provider',
  electricity: 'Preferred Electricity Provider',
  tv: 'Preferred Cable TV Provider',
  betting: 'Preferred Betting Provider',
  education: 'Preferred Exam Provider',
};

module.exports = {
  VTU_PROVIDERS,
  VTU_SERVICES,
  NON_DATA_SERVICES,
  PROVIDER_LABELS,
  SERVICE_LABELS,
  PREFERRED_SERVICE_LABELS,
  defaultServiceRouting,
};
