const { normalizeProvider } = require('./migrateVtuSettings');

const providerLabel = (provider) => (provider === 'vtpass' ? 'VTpass' : 'Clubkonnect');

const resolveProviderPlanCode = (record) => {
  if (!record) return null;
  if (record.providerPlanCode) return record.providerPlanCode;
  const provider = normalizeProvider(record.vtuProvider);
  if (provider === 'vtpass') {
    return record.providerVariationCode || record.vtpassVariationCode || record.variationCode || null;
  }
  return record.providerProductCode || record.planCode || record.variationCode || null;
};

const normalizeDataPlanRecord = (record = {}, providerName) => {
  const provider = normalizeProvider(providerName || record.vtuProvider);
  const providerPlanCode = resolveProviderPlanCode({ ...record, vtuProvider: provider });
  const providerVariationCode = provider === 'vtpass'
    ? (record.providerVariationCode || record.vtpassVariationCode || record.variationCode || providerPlanCode || '')
    : (record.providerVariationCode || '');
  const providerProductCode = provider === 'clubkonnect'
    ? (record.providerProductCode || record.planCode || record.variationCode || providerPlanCode || '')
    : (record.providerProductCode || '');

  return {
    ...record,
    vtuProvider: provider,
    providerPlanCode: providerPlanCode || '',
    providerVariationCode,
    providerProductCode,
    variationCode: provider === 'vtpass'
      ? (record.variationCode || providerVariationCode || providerPlanCode || '')
      : (record.variationCode || providerProductCode || providerPlanCode || ''),
    planCode: provider === 'clubkonnect'
      ? (record.planCode || providerProductCode || providerPlanCode || '')
      : (record.planCode || ''),
    vtpassVariationCode: provider === 'vtpass'
      ? (record.vtpassVariationCode || providerVariationCode || providerPlanCode || '')
      : (record.vtpassVariationCode || ''),
    enabled: record.enabled !== false && record.active !== false,
  };
};

const buildDataPlanSyncUpdate = (providerName, network, remotePlan) => {
  const provider = normalizeProvider(providerName);
  const code = remotePlan.variation_code;
  const planName = remotePlan.name || code;
  const now = new Date();
  const base = {
    network,
    name: planName,
    dataSize: remotePlan.name || planName,
    validity: remotePlan.validity || '30 days',
    amount: parseFloat(remotePlan.variation_amount) || 0,
    enabled: true,
    vtuProvider: provider,
    providerPlanCode: code,
    lastSyncedAt: now,
  };

  if (provider === 'vtpass') {
    return normalizeDataPlanRecord({
      ...base,
      providerVariationCode: code,
      providerProductCode: '',
      variationCode: code,
      vtpassVariationCode: code,
      planCode: '',
    }, provider);
  }

  return normalizeDataPlanRecord({
    ...base,
    providerProductCode: code,
    providerVariationCode: '',
    variationCode: code,
    planCode: code,
    vtpassVariationCode: '',
  }, provider);
};

const mapDataPlanForPublicApi = (plan, inferValidityCategory) => {
  const normalized = normalizeDataPlanRecord(plan.toObject ? plan.toObject() : plan);
  const provider = normalized.vtuProvider;
  const purchaseCode = provider === 'vtpass'
    ? normalized.providerVariationCode || normalized.providerPlanCode
    : normalized.providerProductCode || normalized.providerPlanCode;

  return {
    variation_code: purchaseCode,
    name: normalized.name,
    variation_amount: String(normalized.amount),
    dataSize: normalized.dataSize,
    validity: normalized.validity,
    validityCategory: normalized.validityCategory || inferValidityCategory(normalized.validity),
    category: normalized.category || '',
    commissionPercent: normalized.commissionPercent || 0,
    order: normalized.order || 0,
    provider,
    providerLabel: providerLabel(provider),
    providerPlanCode: normalized.providerPlanCode,
    planId: String(plan._id || plan.id || ''),
    active: normalized.enabled,
  };
};

const DATA_PLAN_EDITABLE_FIELDS = new Set([
  'name', 'amount', 'commissionPercent', 'order', 'enabled', 'validityCategory', 'category', 'dataSize', 'validity',
]);

const pickEditableDataPlanFields = (body = {}) => {
  const payload = {};
  Object.keys(body).forEach((key) => {
    if (DATA_PLAN_EDITABLE_FIELDS.has(key)) payload[key] = body[key];
  });
  if (payload.active !== undefined) {
    payload.enabled = payload.active;
    delete payload.active;
  }
  return payload;
};

module.exports = {
  providerLabel,
  resolveProviderPlanCode,
  normalizeDataPlanRecord,
  buildDataPlanSyncUpdate,
  mapDataPlanForPublicApi,
  pickEditableDataPlanFields,
  DATA_PLAN_EDITABLE_FIELDS,
};
