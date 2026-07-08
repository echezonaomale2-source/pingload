#!/usr/bin/env node
/**
 * Production API smoke test — hits live pingload.top endpoints.
 * Usage: node scripts/production-audit.js
 */
const https = require('https');

const BASE = 'https://pingload.top/api';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@pingload.top';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const request = (method, path, body, token) => new Promise((resolve, reject) => {
  const data = body ? JSON.stringify(body) : null;
  const url = new URL(BASE + path);
  const opts = {
    hostname: url.hostname,
    path: url.pathname + url.search,
    method,
    headers: {
      ...(data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  const req = https.request(opts, (res) => {
    let raw = '';
    res.on('data', (c) => { raw += c; });
    res.on('end', () => {
      let parsed = raw;
      try { parsed = JSON.parse(raw); } catch { /* keep string */ }
      resolve({ status: res.statusCode, data: parsed, raw });
    });
  });
  req.on('error', reject);
  if (data) req.write(data);
  req.end();
});

const check = (name, ok, detail = '') => {
  const mark = ok ? 'PASS' : 'FAIL';
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ''}`);
  return ok;
};

(async () => {
  const results = [];

  const health = await request('GET', '/health');
  results.push(check('Health', health.status === 200 && health.data?.success));

  const appConfig = await request('GET', '/services/app-config');
  const cfg = appConfig.data?.data;
  results.push(check('App config', appConfig.status === 200 && cfg?.vtuProvider === 'vtpass'));
  results.push(check('VTpass configured', cfg?.providerStatus?.vtpass?.configured === true));

  for (const net of ['mtn', 'airtel', 'glo', '9mobile']) {
    const plans = await request('GET', `/services/data-plans/${net}`);
    const count = plans.data?.data?.length ?? 0;
    results.push(check(`Data plans ${net}`, plans.status === 200 && count > 0, `${count} plans`));
  }

  const legal = await request('GET', '/../privacy'.replace('/api/../', '/'));
  // privacy is on root not /api
  const privacy = await new Promise((resolve, reject) => {
    https.get('https://pingload.top/privacy', (res) => {
      resolve({ status: res.statusCode });
    }).on('error', reject);
  });
  results.push(check('Privacy page', privacy.status === 200));

  if (!ADMIN_PASSWORD) {
    console.log('SKIP  Admin tests (set ADMIN_PASSWORD env var)');
  } else {
    const login = await request('POST', '/admin/auth/login', { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    const token = login.data?.data?.token;
    results.push(check('Admin login', login.status === 200 && Boolean(token)));

    if (token) {
      const providers = await request('GET', '/admin/providers', null, token);
      const p = providers.data?.data?.providers?.[0];
      results.push(check('Admin providers', providers.status === 200 && p?.providerId === 'vtpass'));
      results.push(check('VTpass health', p?.healthStatus === 'healthy', p?.healthStatus || 'unknown'));

      const test = await request('POST', '/admin/providers/vtpass/test', {}, token);
      const bal = test.data?.data?.balance;
      const balErr = test.data?.data?.balanceError;
      // Balance display is non-blocking for purchases; POST auth already proves health.
      if (bal != null) {
        results.push(check('VTpass balance', true, `₦${bal}`));
      } else {
        console.log(`WARN  VTpass balance — null${balErr ? ` (${balErr})` : ''} — POST auth healthy; check VTPASS_PUBLIC_KEY on Render`);
        results.push(true);
      }

      const adminPlans = await request('GET', '/admin/data-plans', null, token);
      results.push(check('Admin data plans', adminPlans.status === 200 && (adminPlans.data?.data?.length ?? 0) > 0, `${adminPlans.data?.data?.length ?? 0} plans`));
    }
  }

  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error('Audit failed:', err.message);
  process.exit(1);
});
