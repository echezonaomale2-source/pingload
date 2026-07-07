const vtpass = require('../services/vtpassService');
const clubkonnect = require('../services/clubkonnectService');

const resolvePlanCode = (record, provider) => {
  if (!record) return null;
  if (provider === 'vtpass') {
    return record.vtpassVariationCode || record.variationCode || null;
  }
  return record.planCode || record.variationCode || record.vtpassVariationCode || null;
};

const resolveVariationCode = (record, provider) => resolvePlanCode(record, provider);

const resolveServiceId = (record, provider) => {
  if (!record) return null;
  if (provider === 'vtpass') {
    return record.vtpassServiceId || record.providerServiceId || null;
  }
  return record.providerServiceId || record.vtpassServiceId || null;
};

const variationCodeQuery = (code) => ({
  $or: [
    { providerPlanCode: code },
    { variationCode: code },
    { planCode: code },
    { vtpassVariationCode: code },
    { providerVariationCode: code },
    { providerProductCode: code },
  ],
});

const assignVariationCodeForProvider = (payload, provider) => {
  const next = { ...payload };
  const {
    variationCode,
    planCode,
    vtpassVariationCode,
    clubkonnectVariationCode,
    clubkonnectPlanCode,
  } = payload;

  const clubkonnectCode = clubkonnectPlanCode ?? clubkonnectVariationCode;
  if (clubkonnectCode !== undefined) {
    next.planCode = clubkonnectCode;
    next.variationCode = clubkonnectCode;
  }
  if (planCode !== undefined && planCode !== '') {
    next.planCode = planCode;
    if (provider !== 'vtpass') next.variationCode = planCode;
  }
  if (vtpassVariationCode !== undefined) {
    next.vtpassVariationCode = vtpassVariationCode;
  }
  if (variationCode !== undefined && variationCode !== '') {
    if (provider === 'vtpass') {
      next.vtpassVariationCode = variationCode;
      if (!next.variationCode) next.variationCode = variationCode;
    } else {
      next.planCode = variationCode;
      next.variationCode = variationCode;
      if (!next.vtpassVariationCode) next.vtpassVariationCode = variationCode;
    }
  }

  delete next.clubkonnectVariationCode;
  delete next.clubkonnectPlanCode;
  return next;
};

const assignServiceIdForProvider = (payload, provider) => {
  const next = { ...payload };
  const { providerServiceId, vtpassServiceId, clubkonnectServiceId } = payload;

  if (clubkonnectServiceId !== undefined) {
    next.providerServiceId = clubkonnectServiceId;
  }
  if (vtpassServiceId !== undefined) {
    next.vtpassServiceId = vtpassServiceId || null;
  }
  if (providerServiceId !== undefined) {
    if (provider === 'vtpass') {
      next.vtpassServiceId = providerServiceId || null;
      if (!next.providerServiceId && providerServiceId) {
        next.providerServiceId = providerServiceId;
      }
    } else {
      next.providerServiceId = providerServiceId;
    }
  }

  delete next.clubkonnectServiceId;
  return next;
};

const extractAnyProviderFailureReason = (metadata = {}) => {
  const response = metadata.providerResponse || metadata.vtpassResponse || metadata.clubkonnectResponse;
  if (!response) return null;
  return vtpass.extractVtpassFailureReason(response)
    || clubkonnect.extractProviderFailureReason(response)
    || response.description
    || response.response_description
    || null;
};

const VTU_PROVIDERS = ['clubkonnect', 'vtpass'];

const providerClauseFor = (providerName) => (
  providerName === 'vtpass'
    ? { vtuProvider: 'vtpass' }
    : { $or: [{ vtuProvider: 'clubkonnect' }, { vtuProvider: { $exists: false } }, { vtuProvider: null }] }
);

/** Legacy plans without vtuProvider are treated as Clubkonnect. */
const buildProviderCatalogQuery = (baseFilter, providerName) => ({
  $and: [baseFilter, providerClauseFor(providerName)],
});

/** Show catalogs from multiple active providers at once. */
const buildMultiProviderCatalogQuery = (baseFilter, providerNames = []) => {
  const names = [...new Set((providerNames || []).filter(Boolean))];
  if (names.length === 0) return { ...baseFilter, _id: null };
  if (names.length === 1) return buildProviderCatalogQuery(baseFilter, names[0]);
  return {
    $and: [
      baseFilter,
      { $or: names.map((name) => providerClauseFor(name)) },
    ],
  };
};

const tagWithVtuProvider = (payload, providerName) => ({
  ...payload,
  vtuProvider: providerName === 'vtpass' ? 'vtpass' : 'clubkonnect',
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
