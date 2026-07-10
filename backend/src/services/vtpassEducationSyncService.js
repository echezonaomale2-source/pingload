/**
 * Sync education exam products from VTpass /services?identifier=education
 * and their service-variations.
 */
const EducationProduct = require('../models/EducationProduct');
const vtpass = require('./vtpassService');
const routing = require('./vtuRoutingService');
const { bumpCatalogVersion } = require('../utils/catalogInvalidation');

const EXAM_PATTERNS = [
  { examType: 'waec', patterns: ['waec'] },
  { examType: 'neco', patterns: ['neco'] },
  { examType: 'nabteb', patterns: ['nabteb'] },
  { examType: 'jamb', patterns: ['jamb'] },
];

const normalize = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '');

const matchExamType = (service) => {
  const haystack = normalize(`${service.serviceID || ''} ${service.name || ''}`);
  const match = EXAM_PATTERNS.find((entry) =>
    entry.patterns.some((pattern) => haystack.includes(normalize(pattern))));
  return match?.examType || 'other';
};

const slugify = (value = '') => String(value)
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '')
  .slice(0, 64);

const syncEducationProductsFromVtpass = async () => {
  if (!routing.isProviderConfigured()) {
    const error = new Error('VTpass is not configured on the server');
    error.statusCode = 400;
    throw error;
  }

  const services = await vtpass.listServicesByCategory('education');
  let synced = 0;
  const discovered = [];
  let order = 1;

  for (const service of services) {
    const serviceId = service?.serviceID;
    if (!serviceId) continue;

    const examType = matchExamType(service);
    let variations = [];
    try {
      const result = await vtpass.getEducationVariations(serviceId);
      variations = result?.content?.variations || [];
    } catch {
      variations = [];
    }

    if (!variations.length) {
      const productCode = slugify(serviceId) || `edu-${order}`;
      await EducationProduct.findOneAndUpdate(
        { productCode, vtuProvider: 'vtpass' },
        {
          $set: {
            examType: examType === 'other' ? 'waec' : examType,
            name: service.name || serviceId,
            description: service.name || '',
            providerServiceId: serviceId,
            vtpassServiceId: serviceId,
            variationCode: '',
            amount: parseFloat(service.minimium_amount || service.minimum_amount) || 0,
            enabled: true,
            order,
            vtuProvider: 'vtpass',
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      synced += 1;
      discovered.push({ productCode, serviceId, examType });
      order += 1;
      continue;
    }

    for (const variation of variations) {
      const code = variation.variation_code || '';
      const productCode = slugify(`${serviceId}-${code || variation.name || order}`) || `edu-${order}`;
      await EducationProduct.findOneAndUpdate(
        { productCode, vtuProvider: 'vtpass' },
        {
          $set: {
            examType: examType === 'other' ? 'waec' : examType,
            name: variation.name || service.name || productCode,
            description: variation.name || service.name || '',
            providerServiceId: serviceId,
            vtpassServiceId: serviceId,
            variationCode: code,
            amount: parseFloat(variation.variation_amount) || 0,
            enabled: true,
            order,
            vtuProvider: 'vtpass',
            requiresBillersCode: /jamb/i.test(serviceId) || /jamb/i.test(variation.name || ''),
            billersCodeLabel: /jamb/i.test(serviceId) ? 'JAMB Profile Code' : 'Profile Code',
            maxQuantity: /result|checker|pin/i.test(`${variation.name} ${service.name}`) ? 5 : 1,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      synced += 1;
      discovered.push({ productCode, serviceId, examType, variationCode: code });
      order += 1;
    }
  }

  await bumpCatalogVersion();
  return { synced, discovered, source: 'vtpass' };
};

module.exports = {
  syncEducationProductsFromVtpass,
};
