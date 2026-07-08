const vtpass = require('../services/vtpassService');

const resolvePlanCode = (record) => {
  if (!record) return null;
  return record.vtpassVariationCode || record.variationCode || record.providerPlanCode || null;
};

const resolveVariationCode = (record) => resolvePlanCode(record);

const resolveServiceId = (record) => {
  if (!record) return null;
  return record.vtpassServiceId || record.providerServiceId || null;
};

const variationCodeQuery = (code) => ({
  $or: [
    { providerPlanCode: code },
    { variationCode: code },
    { vtpassVariationCode: code },
    { providerVariationCode: code },
  ],
});

const LEGACY_PROVIDER_FIELDS = [
  'clubkonnectVariationCode',
  'clubkonnectPlanCode',
  'clubkonnectServiceId',
  'planCode',
];

const stripLegacyProviderFields = (payload) => {
  const next = { ...payload };
  for (const field of LEGACY_PROVIDER_FIELDS) {
    delete next[field];
  }
  return next;
};

const assignVariationCodeForProvider = (payload) => {
  const next = { ...payload };
  const { variationCode, vtpassVariationCode } = payload;

  if (vtpassVariationCode !== undefined) {
    next.vtpassVariationCode = vtpassVariationCode;
  }
  if (variationCode !== undefined && variationCode !== '') {
    next.vtpassVariationCode = variationCode;
    next.variationCode = variationCode;
  }

  return stripLegacyProviderFields(next);
};

const assignServiceIdForProvider = (payload) => {
  const next = { ...payload };
  const { providerServiceId, vtpassServiceId } = payload;

  if (vtpassServiceId !== undefined) {
    next.vtpassServiceId = vtpassServiceId || null;
  }
  if (providerServiceId !== undefined) {
    next.vtpassServiceId = providerServiceId || null;
    next.providerServiceId = providerServiceId;
  }

  return stripLegacyProviderFields(next);
};

const extractAnyProviderFailureReason = (metadata = {}) => {
  const response = metadata.providerResponse || metadata.vtpassResponse;
  if (!response) return null;
  return vtpass.extractVtpassFailureReason(response)
    || response.description
    || response.response_description
    || null;
};

const VTU_PROVIDERS = ['vtpass'];

const providerClauseFor = () => ({ vtuProvider: 'vtpass' });

const buildProviderCatalogQuery = (baseFilter) => ({
  $and: [baseFilter, providerClauseFor()],
});

const buildMultiProviderCatalogQuery = (baseFilter) => buildProviderCatalogQuery(baseFilter);

const tagWithVtuProvider = (payload) => ({
  ...payload,
  vtuProvider: 'vtpass',
});

module.exports = {
  VTU_PROVIDERS,
  buildProviderCatalogQuery,
  buildMultiProviderCatalogQuery,
  tagWithVtuProvider,
  resolvePlanCode,
  resolveVariationCode,
  resolveServiceId,
  variationCodeQuery,
  assignVariationCodeForProvider,
  assignServiceIdForProvider,
  extractAnyProviderFailureReason,
};
