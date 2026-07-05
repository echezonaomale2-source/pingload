/** Clubkonnect provider code mappings for Pingload services. */

const NETWORK_CODES = {
  mtn: '01',
  glo: '02',
  '9mobile': '03',
  etisalat: '03',
  airtel: '04',
};

const CABLE_TV_CODES = {
  dstv: 'DStv',
  gotv: 'GOtv',
  startimes: 'Startimes',
};

const ELECTRICITY_PROVIDER_CODES = {
  eko: '01',
  ikeja: '02',
  abuja: '03',
  kano: '04',
  portharcourt: '05',
  jos: '06',
  ibadan: '07',
  kaduna: '08',
  enugu: '09',
};

const METER_TYPE_CODES = {
  prepaid: '01',
  postpaid: '02',
};

/** Clubkonnect betting company codes (BuyBetting.asp order). */
const BETTING_COMPANY_CODES = {
  nairabet: '01',
  bangbet: '02',
  betway: '03',
  betland: '04',
  betking: '05',
  '1xbet': '06',
  naijabet: '07',
  sportybet: '08',
  merrybet: '09',
};

const resolveNetworkCode = (network) =>
  NETWORK_CODES[String(network || '').toLowerCase()] || null;

const resolveCableTvCode = (provider) =>
  CABLE_TV_CODES[String(provider || '').toLowerCase()] || null;

const resolveElectricityCode = (providerId, serviceId) =>
  serviceId || ELECTRICITY_PROVIDER_CODES[String(providerId || '').toLowerCase()] || null;

const resolveMeterTypeCode = (meterType) =>
  METER_TYPE_CODES[String(meterType || '').toLowerCase()] || null;

const resolveBettingCompanyCode = (platformId, serviceId) =>
  serviceId || BETTING_COMPANY_CODES[String(platformId || '').toLowerCase()] || null;

module.exports = {
  NETWORK_CODES,
  CABLE_TV_CODES,
  ELECTRICITY_PROVIDER_CODES,
  METER_TYPE_CODES,
  BETTING_COMPANY_CODES,
  resolveNetworkCode,
  resolveCableTvCode,
  resolveElectricityCode,
  resolveMeterTypeCode,
  resolveBettingCompanyCode,
};
