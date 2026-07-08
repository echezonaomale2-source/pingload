const resolveProviderPlanCode = (record) => {
  if (!record) return null;
  if (record.providerPlanCode) return record.providerPlanCode;
  return record.providerVariationCode || record.vtpassVariationCode || record.variationCode || null;
};

const normalizeDataPlanRecord = (record = {}) => {
  const providerPlanCode = resolveProviderPlanCode(record);
  const providerVariationCode = record.providerVariationCode || record.vtpassVariationCode || record.variationCode || providerPlanCode || '';

  return {
    ...record,
    vtuProvider: 'vtpass',
    providerPlanCode: providerPlanCode || '',
    providerVariationCode,
    providerProductCode: '',
    variationCode: record.variationCode || providerVariationCode || providerPlanCode || '',
    planCode: '',
    vtpassVariationCode: record.vtpassVariationCode || providerVariationCode || providerPlanCode || '',
    enabled: record.enabled !== false && record.active !== false,
  };
};

const buildDataPlanSyncUpdate = (_providerName, network, remotePlan) => {
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
    vtuProvider: 'vtpass',
    providerPlanCode: code,
    lastSyncedAt: now,
  };

  return normalizeDataPlanRecord({
    ...base,
    providerVariationCode: code,
    variationCode: code,
    vtpassVariationCode: code,
  });
};

const mapDataPlanForPublicApi = (plan, inferValidityCategory) => {
  const normalized = normalizeDataPlanRecord(plan.toObject ? plan.toObject() : plan);
  const purchaseCode = normalized.providerVariationCode || normalized.providerPlanCode;

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
    provider: 'vtpass',
    providerLabel: 'VTpass',
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
  resolveProviderPlanCode,
  normalizeDataPlanRecord,
  buildDataPlanSyncUpdate,
  mapDataPlanForPublicApi,
  pickEditableDataPlanFields,
  DATA_PLAN_EDITABLE_FIELDS,
};
