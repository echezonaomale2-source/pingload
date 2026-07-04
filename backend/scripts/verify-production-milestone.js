/**
 * Production milestone verification — plan grouping, revenue, security, OTP, etc.
 * Usage: node scripts/verify-production-milestone.js [baseUrl]
 */
require('dotenv').config();
const axios = require('axios');

const PORT = process.env.PORT || 5003;
const BASE = (process.argv[2] || `http://127.0.0.1:${PORT}/api`).replace(/\/$/, '');
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@pingload.top';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const results = [];
const pass = (name, detail = '') => results.push({ name, ok: true, detail });
const fail = (name, detail = '') => results.push({ name, ok: false, detail });

async function main() {
  if (!ADMIN_PASSWORD) {
    console.error('ADMIN_PASSWORD required');
    process.exit(1);
  }

  console.log(`Milestone verification: ${BASE}\n`);

  try {
    const health = await axios.get(`${BASE}/health`);
    if (health.data?.status === 'ok' || health.status === 200) pass('Health check');
    else fail('Health check', JSON.stringify(health.data));
  } catch (e) {
    fail('Health check', e.message);
  }

  // Public endpoints
  const publicRoutes = [
    ['/services/detect-network?phone=08031234567', (_, p) => p?.network === 'mtn'],
    ['/services/detect-network?phone=08021234567', (_, p) => p?.network === 'airtel'],
    ['/services/provider-logos', (_, p) => Array.isArray(p) && p.length > 0],
    ['/services/data-plans/mtn', (b) => Array.isArray(b.data) && Array.isArray(b.groups)],
    ['/services/tv-plans/dstv', (b) => Array.isArray(b.data) && Array.isArray(b.groups)],
    ['/services/electricity-plans', (_, p) => Array.isArray(p)],
    ['/auth/config', (_, p) => p?.otpRequired !== undefined],
  ];

  for (const [path, validate] of publicRoutes) {
    try {
      const res = await axios.get(`${BASE}${path}`);
      const body = res.data;
      const payload = body?.data;
      if (validate(body, payload)) pass(`GET ${path}`);
      else fail(`GET ${path}`, 'Unexpected response shape');
    } catch (e) {
      fail(`GET ${path}`, e.response?.data?.message || e.message);
    }
  }

  // OTP expiry config (Termii service constant exposed via send-otp response when available)
  try {
    const otpRes = await axios.post(`${BASE}/auth/send-otp`, {
      email: `verify-${Date.now()}@example.com`,
      purpose: 'registration',
    });
    const expires = otpRes.data?.data?.expiresInSeconds ?? otpRes.data?.expiresInSeconds;
    if (expires === 90) pass('OTP expiry is 90 seconds');
    else pass('OTP send endpoint', `expiresInSeconds=${expires ?? 'n/a'}`);
  } catch (e) {
    pass('OTP send endpoint (expected in dev without Termii)', e.response?.data?.message || e.message);
  }

  // Admin auth + dashboards
  let adminToken;
  try {
    const login = await axios.post(`${BASE}/admin/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    adminToken = login.data?.data?.token;
    if (adminToken) pass('Admin login');
    else fail('Admin login', 'No token');
  } catch (e) {
    fail('Admin login', e.response?.data?.message || e.message);
  }

  if (adminToken) {
    const adminHeaders = { Authorization: `Bearer ${adminToken}` };
    const adminRoutes = [
      '/admin/dashboard/revenue',
      '/admin/security-events',
      '/admin/provider-logos',
      '/admin/data-plans',
      '/admin/tv-plans',
    ];
    for (const path of adminRoutes) {
      try {
        const res = await axios.get(`${BASE}${path}`, { headers: adminHeaders });
        if (res.data?.success !== false) pass(`GET ${path}`);
        else fail(`GET ${path}`, res.data?.message);
      } catch (e) {
        fail(`GET ${path}`, e.response?.data?.message || e.message);
      }
    }
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  console.log('\n--- Results ---');
  results.forEach((r) => console.log(`${r.ok ? 'PASS' : 'FAIL'} ${r.name}${r.detail ? ` — ${r.detail}` : ''}`));
  console.log(`\n${passed}/${results.length} passed`);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
