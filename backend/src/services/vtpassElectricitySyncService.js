/**
 * Sync electricity discos from VTpass /services?identifier=electricity-bill
 */
const vtpass = require('./vtpassService');
const routing = require('./vtuRoutingService');
const { bumpCatalogVersion } = require('../utils/catalogInvalidation');
const { upsertElectricityPlanFromSync } = require('../utils/electricityPlanUpsert');

/** Map VTpass serviceID / name → internal providerId */
const PROVIDER_PATTERNS = [
  { id: 'ikeja', name: 'Ikeja Electric (IKEDC)', patterns: ['ikeja'] },
  { id: 'eko', name: 'Eko Electric (EKEDC)', patterns: ['eko'] },
  { id: 'abuja', name: 'Abuja Electric (AEDC)', patterns: ['abuja'] },
  { id: 'ibadan', name: 'Ibadan Electric (IBEDC)', patterns: ['ibadan'] },
  { id: 'kano', name: 'Kano Electric (KEDCO)', patterns: ['kano'] },
  { id: 'jos', name: 'Jos Electric (JED)', patterns: ['jos'] },
  { id: 'benin', name: 'Benin Electric (BEDC)', patterns: ['benin'] },
  { id: 'enugu', name: 'Enugu Electric (EEDC)', patterns: ['enugu'] },
  { id: 'portharcourt', name: 'Port Harcourt Electric (PHED)', patterns: ['portharcourt', 'phelectric'] },
  { id: 'kaduna', name: 'Kaduna Electric (KAEDCO)', patterns: ['kaduna'] },
  { id: 'yola', name: 'Yola Electric (YEDC)', patterns: ['yola'] },
  { id: 'aba', name: 'Aba Electric (APLE)', patterns: ['abaelectric', 'aba-electric', 'aple'] },
];

const normalize = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '');

const matchProvider = (service) => {
  const haystack = normalize(`${service.serviceID || ''} ${service.name || ''}`);
  return PROVIDER_PATTERNS.find((entry) =>
    entry.patterns.some((pattern) => haystack.includes(normalize(pattern))));
};

const syncElectricityPlansFromVtpass = async () => {
  if (!routing.isProviderConfigured()) {
    const error = new Error('VTpass is not configured on the server');
    error.statusCode = 400;
    throw error;
  }

  const services = await vtpass.listServicesByCategory('electricity-bill');
  let synced = 0;
  const discovered = [];
  const seenProviderIds = new Set();
  const seenServiceIds = new Set();

  for (let i = 0; i < services.length; i += 1) {
    const service = services[i];
    const serviceId = String(service?.serviceID || '').trim();
    if (!serviceId || seenServiceIds.has(serviceId)) continue;
    seenServiceIds.add(serviceId);

    const match = matchProvider(service);
    let providerId = match?.id || normalize(serviceId).replace(/electric$/, '') || `disco-${i + 1}`;
    providerId = String(providerId).toLowerCase().trim();

    // If this providerId was already synced from another VTpass service, keep a unique id.
    if (seenProviderIds.has(providerId) && !match) {
      providerId = `${providerId}-${normalize(serviceId).slice(0, 12)}`;
    }
    if (seenProviderIds.has(providerId)) {
      // Same mapped disco appeared twice — update existing via upsert (same providerId).
    } else {
      seenProviderIds.add(providerId);
    }

    const name = match?.name || service.name || serviceId;

    await upsertElectricityPlanFromSync({
      providerId,
      name,
      providerServiceId: serviceId,
      vtpassServiceId: serviceId,
      enabled: true,
      order: match ? PROVIDER_PATTERNS.findIndex((p) => p.id === match.id) + 1 : 100 + i,
      vtuProvider: 'vtpass',
      minAmount: 500,
      maxAmount: 500000,
    });
    synced += 1;
    discovered.push({ providerId, serviceId, name });
  }

  await bumpCatalogVersion();
  return { synced, discovered, source: 'vtpass' };
};

module.exports = {
  syncElectricityPlansFromVtpass,
  PROVIDER_PATTERNS,
};
