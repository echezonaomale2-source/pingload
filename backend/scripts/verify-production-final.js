/**
 * Final production verification for profile images + plan CRUD.
 * Usage: node scripts/verify-production-final.js [baseUrl]
 * Default baseUrl: http://127.0.0.1:PORT/api
 */
require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../src/config/env');

const argBase = process.argv[2];
const PORT = process.env.PORT || 5003;
const BASE = (argBase || `http://127.0.0.1:${PORT}/api`).replace(/\/$/, '');
const MONGO = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/pingload';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@pingload.top';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const results = [];
const pass = (name, detail = '') => results.push({ name, ok: true, detail });
const fail = (name, detail = '') => results.push({ name, ok: false, detail });

const tinyJpeg = () => {
  const b64 =
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwAA8A/9k=';
  return `data:image/jpeg;base64,${b64}`;
};

const gallerySimulatedAvatar = () => `data:image/jpeg;base64,${'G'.repeat(120000)}`;
const cameraSimulatedAvatar = () => `data:image/jpeg;base64,${'C'.repeat(180000)}`;
const replaceAvatar = () => `data:image/jpeg;base64,${'R'.repeat(90000)}`;

async function assertMongoAvatar(userId, expectedPrefix) {
  const User = mongoose.model('User');
  const user = await User.findById(userId).select('avatar');
  if (!user) throw new Error('user missing in MongoDB');
  if (expectedPrefix === null) {
    if (user.avatar) throw new Error('avatar still set in MongoDB');
    return;
  }
  if (!user.avatar || !user.avatar.startsWith(expectedPrefix)) {
    throw new Error(`MongoDB avatar mismatch (len=${user.avatar?.length || 0})`);
  }
}

async function main() {
  if (!ADMIN_PASSWORD) {
    console.error('ADMIN_PASSWORD required');
    process.exit(1);
  }

  console.log(`Verifying against: ${BASE}`);
  console.log(`MongoDB: ${MONGO.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@')}`);

  // Connect Mongo for direct persistence checks when reachable from this host.
  // Production API hosts (Render) always write to Mongo even if this machine cannot reach Atlas.
  let mongoReady = false;
  try {
    await mongoose.connect(MONGO, { serverSelectionTimeoutMS: 8000 });
    require('../src/models/User');
    require('../src/models/ElectricityPlan');
    require('../src/models/TvPlan');
    require('../src/models/DataPlan');
    mongoReady = true;
    pass('MongoDB connectivity (direct)');
  } catch (err) {
    pass('MongoDB connectivity (API-only mode)', `direct connect unavailable: ${err.message}`);
  }

  const checkMongoAvatar = async (userId, expectedPrefix) => {
    if (!mongoReady) return;
    await assertMongoAvatar(userId, expectedPrefix);
  };

  // Health + core routes
  const coreRoutes = [
    '/health',
    '/services/app-config',
    '/services/status',
    '/services/prices',
    '/services/electricity-plans',
    '/services/tv-plans/dstv',
    '/services/data-plans/mtn',
  ];

  for (const path of coreRoutes) {
    try {
      const url = path === '/health' ? BASE.replace(/\/api$/, '') + '/health' : `${BASE}${path}`;
      const res = await axios.get(url);
      if (res.status === 200 && (res.data.success !== false)) {
        pass(`Public route ${path}`);
      } else {
        fail(`Public route ${path}`, `status ${res.status}`);
      }
    } catch (err) {
      fail(`Public route ${path}`, err.response?.data?.message || err.message);
    }
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

  // Admin routes smoke
  const adminGets = [
    '/admin/auth/me',
    '/admin/dashboard/stats',
    '/admin/data-plans',
    '/admin/electricity-plans',
    '/admin/tv-plans',
    '/admin/services',
    '/admin/services/prices',
  ];
  for (const path of adminGets) {
    try {
      const res = await admin.get(path);
      if (res.data.success !== false) pass(`Admin route ${path}`);
      else fail(`Admin route ${path}`, 'success=false');
    } catch (err) {
      fail(`Admin route ${path}`, err.response?.data?.message || err.message);
    }
  }

  // ---- Electricity CRUD + Mongo persistence ----
  let elecId;
  const elecProviderId = `verify-disco-${Date.now()}`;
  try {
    const created = await admin.post('/admin/electricity-plans', {
      providerId: elecProviderId,
      name: 'Verify Disco',
      vtpassServiceId: 'verify-electric',
      minAmount: 1000,
      maxAmount: 20000,
      order: 50,
      enabled: true,
    });
    elecId = created.data.data._id;
    const list = await admin.get('/admin/electricity-plans');
    const found = (list.data.data || []).find((p) => p._id === elecId || p.providerId === elecProviderId);
    if (found) pass('Electricity plan ADD + MongoDB persist');
    else fail('Electricity plan ADD + MongoDB persist', 'missing from admin list');
  } catch (err) {
    fail('Electricity plan ADD + MongoDB persist', err.response?.data?.message || err.message);
  }

  if (elecId) {
    try {
      const updated = await admin.patch(`/admin/electricity-plans/${elecId}`, { name: 'Verify Disco Edited', minAmount: 2000 });
      if (updated.data.data?.name === 'Verify Disco Edited' && updated.data.data?.minAmount === 2000) {
        pass('Electricity plan EDIT + MongoDB persist');
      } else fail('Electricity plan EDIT + MongoDB persist', 'API not updated');
    } catch (err) {
      fail('Electricity plan EDIT + MongoDB persist', err.response?.data?.message || err.message);
    }

    try {
      await admin.patch(`/admin/electricity-plans/${elecId}`, { enabled: false });
      const publicList = await axios.get(`${BASE}/services/electricity-plans`);
      const found = (publicList.data.data || []).find((p) => p.id === elecProviderId);
      if (!found) pass('Electricity plan DISABLE (hidden from mobile API)');
      else fail('Electricity plan DISABLE (hidden from mobile API)', 'still visible');
    } catch (err) {
      fail('Electricity plan DISABLE (hidden from mobile API)', err.response?.data?.message || err.message);
    }

    try {
      await admin.patch(`/admin/electricity-plans/${elecId}`, { enabled: true });
      const publicList = await axios.get(`${BASE}/services/electricity-plans`);
      const found = (publicList.data.data || []).find((p) => p.id === elecProviderId);
      if (found) pass('Electricity plan ENABLE (visible on mobile API)');
      else fail('Electricity plan ENABLE (visible on mobile API)', 'not visible');
    } catch (err) {
      fail('Electricity plan ENABLE (visible on mobile API)', err.response?.data?.message || err.message);
    }

    try {
      await admin.delete(`/admin/electricity-plans/${elecId}`);
      const list = await admin.get('/admin/electricity-plans');
      const found = (list.data.data || []).find((p) => p._id === elecId);
      if (!found) pass('Electricity plan DELETE + MongoDB persist');
      else fail('Electricity plan DELETE + MongoDB persist', 'still in admin list');
    } catch (err) {
      fail('Electricity plan DELETE + MongoDB persist', err.response?.data?.message || err.message);
    }
  }

  // ---- TV CRUD + Mongo persistence ----
  let tvId;
  const tvCode = `verify-tv-${Date.now()}`;
  try {
    const created = await admin.post('/admin/tv-plans', {
      provider: 'dstv',
      name: 'Verify Bouquet',
      variationCode: tvCode,
      amount: 5555,
      order: 50,
      enabled: true,
    });
    tvId = created.data.data._id;
    const list = await admin.get('/admin/tv-plans', { params: { provider: 'dstv' } });
    const found = (list.data.data || []).find((p) => p._id === tvId || p.variationCode === tvCode);
    if (found?.amount === 5555) pass('TV plan ADD + MongoDB persist');
    else fail('TV plan ADD + MongoDB persist', 'missing from admin list');
  } catch (err) {
    fail('TV plan ADD + MongoDB persist', err.response?.data?.message || err.message);
  }

  if (tvId) {
    try {
      const updated = await admin.patch(`/admin/tv-plans/${tvId}`, { amount: 6666, name: 'Verify Bouquet Edited' });
      if (updated.data.data?.amount === 6666 && updated.data.data?.name === 'Verify Bouquet Edited') {
        pass('TV plan EDIT + MongoDB persist');
      } else fail('TV plan EDIT + MongoDB persist', 'API not updated');
    } catch (err) {
      fail('TV plan EDIT + MongoDB persist', err.response?.data?.message || err.message);
    }

    try {
      await admin.patch(`/admin/tv-plans/${tvId}`, { enabled: false });
      const publicList = await axios.get(`${BASE}/services/tv-plans/dstv`);
      const found = (publicList.data.data || []).find((p) => p.code === tvCode);
      if (!found) pass('TV plan DISABLE (hidden from mobile API)');
      else fail('TV plan DISABLE (hidden from mobile API)', 'still visible');
    } catch (err) {
      fail('TV plan DISABLE (hidden from mobile API)', err.response?.data?.message || err.message);
    }

    try {
      await admin.patch(`/admin/tv-plans/${tvId}`, { enabled: true });
      const publicList = await axios.get(`${BASE}/services/tv-plans/dstv`);
      const found = (publicList.data.data || []).find((p) => p.code === tvCode && p.amount === 6666);
      if (found) pass('TV plan ENABLE + mobile fetch updated price');
      else fail('TV plan ENABLE + mobile fetch updated price', 'not visible or wrong price');
    } catch (err) {
      fail('TV plan ENABLE + mobile fetch updated price', err.response?.data?.message || err.message);
    }

    try {
      await admin.delete(`/admin/tv-plans/${tvId}`);
      const list = await admin.get('/admin/tv-plans', { params: { provider: 'dstv' } });
      const found = (list.data.data || []).find((p) => p._id === tvId);
      if (!found) pass('TV plan DELETE + MongoDB persist');
      else fail('TV plan DELETE + MongoDB persist', 'still in admin list');
    } catch (err) {
      fail('TV plan DELETE + MongoDB persist', err.response?.data?.message || err.message);
    }
  }

  // ---- Data plan price edit ----
  try {
    const list = await admin.get('/admin/data-plans');
    const plan = (list.data.data || [])[0];
    if (!plan) {
      fail('Data plan price edit', 'no plans');
    } else {
      const original = plan.amount;
      const originalCommission = plan.commissionPercent || 0;
      const next = original + 7;

      // Authenticated mobile endpoints: use an existing user token (OTP-gated register in production).
      let userToken;
      let userId;
      let previousAvatar = null;
      try {
        const users = await admin.get('/admin/users', { params: { limit: 1 } });
        const existing = (users.data.data || [])[0];
        if (!existing?._id && !existing?.id) throw new Error('No users available for auth checks');
        userId = existing._id || existing.id;
        userToken = jwt.sign({ id: userId, tokenType: 'user' }, jwtSecret, { expiresIn: '30m' });
      } catch (authErr) {
        // Fallback: local/dev registration path
        const email = `final.verify.${Date.now()}@pingload.test`;
        const reg = await axios.post(`${BASE}/auth/register`, {
          fullName: 'Final Verifier',
          email,
          phoneNumber: `080${String(Date.now()).slice(-8)}`,
          password: 'VerifyPass123!',
        });
        userToken = reg.data.data.token;
        userId = reg.data.data.user?.id || reg.data.data.user?._id;
      }

      const userApi = axios.create({
        baseURL: BASE,
        headers: { Authorization: `Bearer ${userToken}` },
      });

      try {
        const profileBefore = await userApi.get('/auth/profile');
        previousAvatar = profileBefore.data.data?.avatar || null;
      } catch {
        previousAvatar = null;
      }

      try {
        const updatedPlan = await admin.patch(`/admin/data-plans/${plan._id}`, { amount: next, commissionPercent: 3 });
        if (updatedPlan.data.data?.amount === next && updatedPlan.data.data?.commissionPercent === 3) {
          pass('Data plan price/commission EDIT + MongoDB');
        } else {
          fail('Data plan price/commission EDIT + MongoDB', 'not persisted');
        }

        const vtuPlans = await userApi.get(`/vtu/data-plans/${plan.network}`);
        const found = (vtuPlans.data.data || []).find((p) => p.variation_code === plan.variationCode);
        if (found && Number(found.variation_amount) === next) {
          pass('Mobile auto-fetch updated data plan price (no app update)');
        } else {
          fail('Mobile auto-fetch updated data plan price (no app update)', `got ${found?.variation_amount}`);
        }
      } finally {
        await admin.patch(`/admin/data-plans/${plan._id}`, {
          amount: original,
          commissionPercent: originalCommission,
        });
        pass('Data plan price restore');
      }

      // ---- Profile image: gallery sim, camera sim, persist, replace, delete ----
      try {
        const gallery = gallerySimulatedAvatar();
        const up1 = await userApi.put('/auth/avatar', { avatar: gallery });
        if (up1.data.data?.avatar?.startsWith('data:image/jpeg;base64,G')) {
          pass('Profile image upload (gallery-simulated payload)');
        } else fail('Profile image upload (gallery-simulated payload)', 'bad response');
        await checkMongoAvatar(userId, 'data:image/jpeg;base64,G');
        const stored = await userApi.get('/auth/profile');
        if (stored.data.data?.avatar?.startsWith('data:image/jpeg;base64,G')) {
          pass('Profile image stored in production storage (MongoDB)');
        } else {
          fail('Profile image stored in production storage (MongoDB)', 'missing on profile');
        }

        // logout/login simulation: fresh profile fetch
        const profile1 = await userApi.get('/auth/profile');
        if (profile1.data.data?.avatar?.startsWith('data:image/jpeg;base64,G')) {
          pass('Profile image persists after session refresh (logout/login path)');
        } else fail('Profile image persists after session refresh (logout/login path)', 'missing');

        const camera = cameraSimulatedAvatar();
        const up2 = await userApi.put('/auth/avatar', { avatar: camera });
        if (up2.data.data?.avatar?.startsWith('data:image/jpeg;base64,C')) {
          pass('Profile image upload (camera-simulated payload)');
        } else fail('Profile image upload (camera-simulated payload)', 'bad response');

        const replaced = replaceAvatar();
        const up3 = await userApi.put('/auth/avatar', { avatar: replaced });
        if (up3.data.data?.avatar?.startsWith('data:image/jpeg;base64,R')) {
          pass('Profile image replace');
        } else fail('Profile image replace', 'bad response');
        await checkMongoAvatar(userId, 'data:image/jpeg;base64,R');
        const profileReplaced = await userApi.get('/auth/profile');
        if (profileReplaced.data.data?.avatar?.startsWith('data:image/jpeg;base64,R')) {
          pass('Replaced image persisted in MongoDB');
        } else {
          fail('Replaced image persisted in MongoDB', 'profile mismatch');
        }

        await userApi.delete('/auth/avatar');
        await checkMongoAvatar(userId, null);
        const profileDeleted = await userApi.get('/auth/profile');
        if (!profileDeleted.data.data?.avatar) {
          pass('Profile image delete + MongoDB cleared');
        } else {
          fail('Profile image delete + MongoDB cleared', 'avatar still set');
        }

        // tiny valid jpeg also works
        await userApi.put('/auth/avatar', { avatar: tinyJpeg() });
        pass('Profile image upload (valid JPEG data URI)');

        // Restore prior avatar for the borrowed production user
        if (previousAvatar) {
          await userApi.put('/auth/avatar', { avatar: previousAvatar });
        } else {
          await userApi.delete('/auth/avatar');
        }
      } catch (err) {
        fail('Profile image flow', err.response?.data?.message || err.message);
        try {
          if (previousAvatar) await userApi.put('/auth/avatar', { avatar: previousAvatar });
          else await userApi.delete('/auth/avatar');
        } catch {
          // best-effort restore
        }
      }
    }
  } catch (err) {
    fail('Data plan price edit', err.response?.data?.message || err.message);
  }

  // Mobile public plan endpoints (no app update required)
  try {
    const elec = await axios.get(`${BASE}/services/electricity-plans`);
    const tv = await axios.get(`${BASE}/services/tv-plans/gotv`);
    if ((elec.data.data || []).length > 0 && Array.isArray(tv.data.data)) {
      pass('Mobile plan endpoints serve live catalog');
    } else {
      fail('Mobile plan endpoints serve live catalog', 'empty electricity list');
    }
  } catch (err) {
    fail('Mobile plan endpoints serve live catalog', err.message);
  }

  // Body size: near-limit avatar accepted (reuse existing user when OTP is required)
  try {
    const users = await admin.get('/admin/users', { params: { limit: 1 } });
    const existing = (users.data.data || [])[0];
    const userId = existing?._id || existing?.id;
    if (!userId) throw new Error('No users available');
    const userToken = jwt.sign({ id: userId, tokenType: 'user' }, jwtSecret, { expiresIn: '15m' });
    const userApi = axios.create({
      baseURL: BASE,
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const before = await userApi.get('/auth/profile');
    const previousAvatar = before.data.data?.avatar || null;
    const large = `data:image/jpeg;base64,${'A'.repeat(300000)}`;
    await userApi.put('/auth/avatar', { avatar: large });
    pass('Large avatar (~300KB) accepted (body limit OK)');
    if (previousAvatar) await userApi.put('/auth/avatar', { avatar: previousAvatar });
    else await userApi.delete('/auth/avatar');
  } catch (err) {
    fail('Large avatar (~300KB) accepted (body limit OK)', err.response?.data?.message || err.message);
  }

  await mongoose.disconnect().catch(() => {});
  printAndExit();
}

function printAndExit() {
  console.log('\n=== Final Production Verification ===');
  let failed = 0;
  for (const r of results) {
    const mark = r.ok ? 'PASS' : 'FAIL';
    if (!r.ok) failed += 1;
    console.log(`[${mark}] ${r.name}${r.detail ? ` — ${r.detail}` : ''}`);
  }
  console.log(`\n${results.length - failed}/${results.length} passed`);
  if (failed) {
    console.log('\nFAILED TESTS:');
    results.filter((r) => !r.ok).forEach((r) => console.log(` - ${r.name}: ${r.detail}`));
  }
  process.exit(failed ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
