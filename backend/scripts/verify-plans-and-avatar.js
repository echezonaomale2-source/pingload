/**
 * Verification script for profile avatar limits, electricity/TV/data plan CRUD.
 * Run: node scripts/verify-plans-and-avatar.js
 * Expects API on PORT (default 5003) and ADMIN_* credentials in env.
 */
require('dotenv').config();
const axios = require('axios');

const PORT = process.env.PORT || 5003;
const BASE = `http://127.0.0.1:${PORT}/api`;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@pingload.top';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const results = [];
const pass = (name, detail = '') => results.push({ name, ok: true, detail });
const fail = (name, detail = '') => results.push({ name, ok: false, detail });

const tinyJpegDataUri = () => {
  // 1x1 JPEG base64
  const b64 =
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=';
  return `data:image/jpeg;base64,${b64}`;
};

const oversizedAvatar = () => `data:image/jpeg;base64,${'A'.repeat(510000)}`;

async function main() {
  if (!ADMIN_PASSWORD) {
    console.error('ADMIN_PASSWORD is required');
    process.exit(1);
  }

  // Health
  try {
    const health = await axios.get(`${BASE}/health`);
    pass('API health', health.data.message);
  } catch (err) {
    fail('API health', err.message);
    printAndExit();
  }

  // Public plan endpoints
  try {
    const elec = await axios.get(`${BASE}/services/electricity-plans`);
    const plans = elec.data.data || [];
    if (plans.length > 0 && plans[0].id && plans[0].name) {
      pass('Public electricity plans', `${plans.length} providers`);
    } else {
      fail('Public electricity plans', 'empty or invalid payload');
    }
  } catch (err) {
    fail('Public electricity plans', err.response?.data?.message || err.message);
  }

  try {
    const tv = await axios.get(`${BASE}/services/tv-plans/dstv`);
    const plans = tv.data.data || [];
    if (plans.length > 0 && plans[0].code && plans[0].amount != null) {
      pass('Public TV plans (dstv)', `${plans.length} packages`);
    } else {
      fail('Public TV plans (dstv)', 'empty or invalid payload');
    }
  } catch (err) {
    fail('Public TV plans (dstv)', err.response?.data?.message || err.message);
  }

  // Admin auth
  let adminToken;
  try {
    const login = await axios.post(`${BASE}/admin/auth/login`, {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    adminToken = login.data.data.token;
    pass('Admin login');
  } catch (err) {
    fail('Admin login', err.response?.data?.message || err.message);
    printAndExit();
  }

  const admin = axios.create({
    baseURL: BASE,
    headers: { Authorization: `Bearer ${adminToken}` },
  });

  // Electricity CRUD
  let elecId;
  try {
    const created = await admin.post('/admin/electricity-plans', {
      providerId: `test-disco-${Date.now()}`,
      name: 'Test Disco',
      providerServiceId: 'test-electric',
      minAmount: 1000,
      maxAmount: 50000,
      order: 99,
      enabled: true,
    });
    elecId = created.data.data._id;
    pass('Create electricity plan', elecId);
  } catch (err) {
    fail('Create electricity plan', err.response?.data?.message || err.message);
  }

  if (elecId) {
    try {
      const updated = await admin.patch(`/admin/electricity-plans/${elecId}`, {
        name: 'Test Disco Updated',
        minAmount: 1500,
        enabled: false,
      });
      if (updated.data.data.name === 'Test Disco Updated' && updated.data.data.enabled === false) {
        pass('Edit/disable electricity plan');
      } else {
        fail('Edit/disable electricity plan', 'unexpected response');
      }
    } catch (err) {
      fail('Edit/disable electricity plan', err.response?.data?.message || err.message);
    }

    try {
      // Disabled plan should not appear in public list
      const publicList = await axios.get(`${BASE}/services/electricity-plans`);
      const found = (publicList.data.data || []).find((p) => p.name === 'Test Disco Updated');
      if (!found) pass('Disabled electricity plan hidden from public API');
      else fail('Disabled electricity plan hidden from public API', 'still visible');
    } catch (err) {
      fail('Disabled electricity plan hidden from public API', err.message);
    }

    try {
      await admin.delete(`/admin/electricity-plans/${elecId}`);
      pass('Delete electricity plan');
    } catch (err) {
      fail('Delete electricity plan', err.response?.data?.message || err.message);
    }
  }

  // TV CRUD
  let tvId;
  const tvCode = `test-bouquet-${Date.now()}`;
  try {
    const created = await admin.post('/admin/tv-plans', {
      provider: 'dstv',
      name: 'Test Bouquet',
      variationCode: tvCode,
      amount: 9999,
      order: 99,
      enabled: true,
    });
    tvId = created.data.data._id;
    pass('Create TV plan', tvId);
  } catch (err) {
    fail('Create TV plan', err.response?.data?.message || err.message);
  }

  if (tvId) {
    try {
      const updated = await admin.patch(`/admin/tv-plans/${tvId}`, {
        amount: 8888,
        enabled: false,
      });
      if (updated.data.data.amount === 8888 && updated.data.data.enabled === false) {
        pass('Edit/disable TV plan');
      } else {
        fail('Edit/disable TV plan', 'unexpected response');
      }
    } catch (err) {
      fail('Edit/disable TV plan', err.response?.data?.message || err.message);
    }

    try {
      const publicList = await axios.get(`${BASE}/services/tv-plans/dstv`);
      const found = (publicList.data.data || []).find((p) => p.code === tvCode);
      if (!found) pass('Disabled TV plan hidden from public API');
      else fail('Disabled TV plan hidden from public API', 'still visible');
    } catch (err) {
      fail('Disabled TV plan hidden from public API', err.message);
    }

    // Duplicate prevention
    try {
      await admin.post('/admin/tv-plans', {
        provider: 'dstv',
        name: 'Dup Bouquet',
        variationCode: tvCode,
        amount: 100,
      });
      fail('TV plan duplicate prevention', 'duplicate was allowed');
    } catch (err) {
      if (err.response?.status === 409) pass('TV plan duplicate prevention');
      else fail('TV plan duplicate prevention', err.response?.data?.message || err.message);
    }

    try {
      await admin.delete(`/admin/tv-plans/${tvId}`);
      pass('Delete TV plan');
    } catch (err) {
      fail('Delete TV plan', err.response?.data?.message || err.message);
    }
  }

  // Data plan price update
  try {
    const list = await admin.get('/admin/data-plans');
    const plan = (list.data.data || [])[0];
    if (!plan) {
      fail('Data plan price update', 'no plans found');
    } else {
      const originalAmount = plan.amount;
      const newAmount = originalAmount + 1;
      const updated = await admin.patch(`/admin/data-plans/${plan._id}`, {
        amount: newAmount,
        commissionPercent: 2.5,
      });
      if (updated.data.data.amount === newAmount) {
        pass('Data plan price/commission update', `amount ${originalAmount} → ${newAmount}`);
        // restore
        await admin.patch(`/admin/data-plans/${plan._id}`, {
          amount: originalAmount,
          commissionPercent: plan.commissionPercent || 0,
        });
        pass('Data plan price restore');
      } else {
        fail('Data plan price/commission update', 'amount not updated');
      }
    }
  } catch (err) {
    fail('Data plan price/commission update', err.response?.data?.message || err.message);
  }

  // Avatar body size acceptance (no auth — expect 401, not 413)
  try {
    await axios.put(`${BASE}/auth/avatar`, { avatar: tinyJpegDataUri() });
    fail('Avatar endpoint reachable', 'expected 401 without token');
  } catch (err) {
    if (err.response?.status === 401) pass('Avatar endpoint rejects unauthenticated (not body-limit)');
    else if (err.response?.status === 413) fail('Avatar endpoint body limit', '413 payload too large for tiny image');
    else pass('Avatar endpoint reachable', `status ${err.response?.status}`);
  }

  // Oversized avatar should be rejected by express or controller (401 first without auth)
  // Register a temp user to fully test avatar upload
  const email = `avatar.verify.${Date.now()}@pingload.test`;
  const password = 'VerifyPass123!';
  let userToken;
  try {
    // Try register — may require OTP in production
    const reg = await axios.post(`${BASE}/auth/register`, {
      fullName: 'Avatar Verifier',
      email,
      phoneNumber: `080${String(Date.now()).slice(-8)}`,
      password,
    });
    userToken = reg.data?.data?.token;
    if (userToken) pass('Temp user register for avatar test');
    else fail('Temp user register for avatar test', 'no token');
  } catch (err) {
    // Registration may be OTP-gated; skip user-level avatar tests
    fail('Temp user register for avatar test', err.response?.data?.message || err.message);
  }

  if (userToken) {
    const userApi = axios.create({
      baseURL: BASE,
      headers: { Authorization: `Bearer ${userToken}` },
    });

    try {
      const up = await userApi.put('/auth/avatar', { avatar: tinyJpegDataUri() });
      if (up.data.data?.avatar?.startsWith('data:image/')) {
        pass('Avatar upload stores data URI');
      } else {
        fail('Avatar upload stores data URI', 'missing avatar in response');
      }
    } catch (err) {
      fail('Avatar upload stores data URI', err.response?.data?.message || err.message);
    }

    try {
      const profile = await userApi.get('/auth/profile');
      if (profile.data.data?.avatar?.startsWith('data:image/')) {
        pass('Avatar persists on profile fetch');
      } else {
        fail('Avatar persists on profile fetch', 'avatar missing');
      }
    } catch (err) {
      fail('Avatar persists on profile fetch', err.response?.data?.message || err.message);
    }

    try {
      await userApi.put('/auth/avatar', { avatar: oversizedAvatar() });
      fail('Oversized avatar rejected', 'was accepted');
    } catch (err) {
      if (err.response?.status === 400 || err.response?.status === 413) {
        pass('Oversized avatar rejected', `status ${err.response.status}`);
      } else {
        fail('Oversized avatar rejected', err.response?.data?.message || err.message);
      }
    }

    try {
      const removed = await userApi.delete('/auth/avatar');
      if (!removed.data.data?.avatar) pass('Avatar delete');
      else fail('Avatar delete', 'avatar still set');
    } catch (err) {
      fail('Avatar delete', err.response?.data?.message || err.message);
    }
  }

  printAndExit();
}

function printAndExit() {
  console.log('\n=== Verification Results ===');
  let failed = 0;
  for (const r of results) {
    const mark = r.ok ? 'PASS' : 'FAIL';
    if (!r.ok) failed += 1;
    console.log(`[${mark}] ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
  }
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
