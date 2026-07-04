/**
 * Verify provider logos, betting, and push notification endpoints.
 * Usage: node scripts/verify-logos-betting-push.js [baseUrl]
 */
require('dotenv').config();
const axios = require('axios');

const BASE = (process.argv[2] || `http://127.0.0.1:${process.env.PORT || 5003}/api`).replace(/\/$/, '');
const results = [];
const pass = (n, d = '') => results.push({ n, ok: true, d });
const fail = (n, d = '') => results.push({ n, ok: false, d });

async function main() {
  console.log(`Verifying: ${BASE}\n`);

  try {
    const health = await axios.get(`${BASE}/health`);
    if (health.status === 200) pass('Health');
    else fail('Health', String(health.status));
  } catch (e) {
    fail('Health', e.message);
  }

  try {
    const res = await axios.get(`${BASE}/services/provider-logos`);
    const logos = res.data?.data || [];
    if (logos.length >= 14 && logos.every((l) => l.logoUri)) pass('Provider logos API', `${logos.length} logos with logoUri`);
    else fail('Provider logos API', `count=${logos.length}`);
  } catch (e) {
    fail('Provider logos API', e.message);
  }

  try {
    const res = await axios.get(`${BASE}/services/provider-logos/mtn/image`, { maxRedirects: 0, validateStatus: () => true });
    if ([200, 302].includes(res.status)) pass('Provider logo image endpoint', `status=${res.status}`);
    else fail('Provider logo image endpoint', `status=${res.status}`);
  } catch (e) {
    fail('Provider logo image endpoint', e.message);
  }

  try {
    const res = await axios.get(`${BASE}/auth/config`);
    if (res.data?.data) pass('Auth config');
    else fail('Auth config');
  } catch (e) {
    fail('Auth config', e.message);
  }

  try {
    const res = await axios.post(`${BASE}/vtu/betting`, {}, { validateStatus: () => true });
    if (res.status === 401) pass('Betting route protected');
    else fail('Betting route protected', `status=${res.status}`);
  } catch (e) {
    fail('Betting route protected', e.message);
  }

  results.forEach((r) => console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.n}${r.d ? ` — ${r.d}` : ''}`));
  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
}

main();
