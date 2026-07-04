const normalizeNigerianPhone = (phone = '') => {
  let digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('234')) digits = `0${digits.slice(3)}`;
  if (digits.length === 10 && !digits.startsWith('0')) digits = `0${digits}`;
  return digits;
};

const isValidNigerianPhone = (phone = '') => /^0[789][01]\d{8}$/.test(normalizeNigerianPhone(phone));

module.exports = {
  normalizeNigerianPhone,
  isValidNigerianPhone,
};
