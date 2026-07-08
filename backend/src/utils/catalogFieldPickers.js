const pickFields = (body = {}, allowed = []) => {
  const payload = {};
  allowed.forEach((key) => {
    if (body[key] !== undefined) payload[key] = body[key];
  });
  return payload;
};

const ELECTRICITY_PLAN_FIELDS = [
  'providerId', 'name', 'providerServiceId', 'minAmount', 'maxAmount', 'order', 'enabled',
];

const TV_PLAN_FIELDS = [
  'provider', 'name', 'variationCode', 'amount', 'category', 'order', 'enabled',
];

const EDUCATION_PRODUCT_FIELDS = [
  'examType', 'productCode', 'name', 'providerServiceId', 'amount', 'order', 'enabled',
];

const DATA_PLAN_CREATE_FIELDS = [
  'network', 'name', 'dataSize', 'validity', 'validityCategory', 'category',
  'variationCode', 'amount', 'commissionPercent', 'order', 'enabled',
];

const pickElectricityPlanFields = (body) => pickFields(body, ELECTRICITY_PLAN_FIELDS);
const pickTvPlanFields = (body) => pickFields(body, TV_PLAN_FIELDS);
const pickEducationProductFields = (body) => pickFields(body, EDUCATION_PRODUCT_FIELDS);
const pickDataPlanCreateFields = (body) => pickFields(body, DATA_PLAN_CREATE_FIELDS);

module.exports = {
  pickElectricityPlanFields,
  pickTvPlanFields,
  pickEducationProductFields,
  pickDataPlanCreateFields,
};
