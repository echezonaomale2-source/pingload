/**
 * Build Paystack checkout callback URL without duplicating path segments.
 * FRONTEND_URL examples:
 *   pingload://wallet/verify
 *   https://pingload.top/wallet/verify
 *   pingload://
 */
const buildPaystackCallbackUrl = (frontendUrl, reference) => {
  const base = (frontendUrl || '').replace(/\/$/, '');
  if (!base) return `pingload://wallet/verify?reference=${reference}`;

  if (base.includes('?')) {
    const joiner = base.includes('reference=') ? '&' : '?';
    return `${base}${joiner}reference=${reference}`;
  }

  if (/\/wallet\/verify$/i.test(base) || base.endsWith('wallet/verify')) {
    return `${base}?reference=${reference}`;
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(base) && !base.startsWith('http')) {
    return `${base}/wallet/verify?reference=${reference}`;
  }

  return `${base}/wallet/verify?reference=${reference}`;
};

module.exports = { buildPaystackCallbackUrl };
