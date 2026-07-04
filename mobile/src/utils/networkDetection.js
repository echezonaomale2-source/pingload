const PREFIX_MAP = [
  { network: 'mtn', prefixes: ['0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916'] },
  { network: 'airtel', prefixes: ['0802', '0808', '0708', '0812', '0701', '0902', '0901', '0907', '0912'] },
  { network: 'glo', prefixes: ['0805', '0807', '0705', '0815', '0811', '0905', '0915'] },
  { network: '9mobile', prefixes: ['0809', '0817', '0818', '0909', '0908'] },
];

export const normalizePhone = (phone = '') => {
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('234')) digits = `0${digits.slice(3)}`;
  if (digits.length === 10 && !digits.startsWith('0')) digits = `0${digits}`;
  return digits;
};

export const detectNetworkFromPhone = (phone) => {
  const normalized = normalizePhone(phone);
  if (normalized.length < 4) return null;
  const prefix = normalized.slice(0, 4);
  const match = PREFIX_MAP.find((entry) => entry.prefixes.includes(prefix));
  return match?.network || null;
};

export const NETWORK_LABELS = {
  mtn: 'MTN',
  airtel: 'Airtel',
  glo: 'Glo',
  '9mobile': '9mobile',
};
