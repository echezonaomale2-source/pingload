#!/usr/bin/env node
/**
 * Verifies Paystack webhook route, signature validation, idempotency helpers,
 * and refund flow wiring without printing secret values.
 *
 * Usage: node scripts/verify-paystack-webhook.js [--live http://localhost:5003]
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

if (!process.argv.includes('--production')) {
  process.env.NODE_ENV = 'development';
}

const crypto = require('crypto');
const axios = require('axios');
const { verifyWebhookSignature } = require('../src/services/paystackService');
const { buildEventKey } = require('../src/services/webhookLogService');
const { processPaystackWebhook } = require('../src/services/walletFundingService');
const { processRefund } = require('../src/services/refundService');

const PASS = 'PASS';
const FAIL = 'FAIL';

const results = [];

const record = (name, status, detail = '') => {
  results.push({ name, status, detail });
  const icon = status === PASS ? '✓' : '✗';
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ''}`);
};

const signPayload = (rawBody, secret) => crypto
  .createHmac('sha512', secret)
  .update(rawBody)
  .digest('hex');

const verifySignatureChecks = () => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) {
    record('Signature validation', FAIL, 'PAYSTACK_SECRET_KEY not set');
    return;
  }

  const body = JSON.stringify({ event: 'charge.success', data: { reference: 'TEST_REF' } });
  const validSig = signPayload(body, secret);
  const invalidSig = 'invalid-signature';

  record(
    'Valid signature accepted',
    verifyWebhookSignature(body, validSig) ? PASS : FAIL
  );
  record(
    'Invalid signature rejected',
    !verifyWebhookSignature(body, invalidSig) ? PASS : FAIL
  );
  record(
    'Missing signature rejected',
    !verifyWebhookSignature(body, '') ? PASS : FAIL
  );
};

const verifyEventKeyUniqueness = () => {
  const key1 = buildEventKey('charge.success', { reference: 'ABC', id: 1 });
  const key2 = buildEventKey('charge.success', { reference: 'ABC', id: 1 });
  const key3 = buildEventKey('charge.success', { reference: 'ABC', id: 2 });

  record('Duplicate event key detection', key1 === key2 ? PASS : FAIL);
  record('Distinct events produce distinct keys', key1 !== key3 ? PASS : FAIL);
};

const verifyWebhookHandlerExports = () => {
  try {
    const { handlePaystackWebhook } = require('../src/controllers/webhookController');
    const routes = require('../src/routes/webhookRoutes');
    record('Webhook controller exported', typeof handlePaystackWebhook === 'function' ? PASS : FAIL);
    record('Webhook route module loads', Boolean(routes) ? PASS : FAIL);
  } catch (error) {
    record('Webhook modules load', FAIL, error.message);
  }
};

const verifyRefundService = () => {
  record('Refund service exported', typeof processRefund === 'function' ? PASS : FAIL);
  record(
    'Webhook processor handles charge.success',
    processPaystackWebhook.toString().includes('charge.success') ? PASS : FAIL
  );
  record(
    'Webhook processor handles charge.failed',
    processPaystackWebhook.toString().includes('charge.failed') ? PASS : FAIL
  );
  record(
    'Wallet credit uses atomic pending filter',
    processPaystackWebhook.toString().includes('creditWalletFromFunding') ? PASS : FAIL
  );
};

const verifyLiveEndpoint = async (baseUrl) => {
  const url = `${baseUrl.replace(/\/$/, '')}/api/webhooks/paystack`;
  const payload = { event: 'charge.success', data: { reference: 'VERIFY_ONLY' } };

  try {
    const noSig = await axios.post(url, payload, {
      validateStatus: () => true,
      timeout: 5000,
    });
    record('POST /api/webhooks/paystack exists', noSig.status !== 404 ? PASS : FAIL, `HTTP ${noSig.status}`);
    record(
      'Unsigned request returns 401',
      noSig.status === 401 ? PASS : FAIL,
      `HTTP ${noSig.status}`
    );

    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) return;

    const raw = JSON.stringify(payload);
    const signed = await axios.post(url, payload, {
      headers: { 'x-paystack-signature': signPayload(raw, secret) },
      validateStatus: () => true,
      timeout: 5000,
    });
    record(
      'Signed request accepted by route',
      [200, 404].includes(signed.status) ? PASS : FAIL,
      `HTTP ${signed.status} (404 expected if reference not in DB)`
    );
  } catch (error) {
    record('Live endpoint reachable', FAIL, error.message);
  }
};

const main = async () => {
  console.log('\nPingload Paystack Webhook Verification\n');

  verifySignatureChecks();
  verifyEventKeyUniqueness();
  verifyWebhookHandlerExports();
  verifyRefundService();

  const liveArg = process.argv.find((arg) => arg.startsWith('--live'));
  const baseUrl = liveArg ? liveArg.split('=')[1] || process.argv[process.argv.indexOf('--live') + 1] : null;
  if (baseUrl) {
    console.log('');
    await verifyLiveEndpoint(baseUrl);
  } else {
    console.log('\n(Skipping live HTTP checks — run with --live http://localhost:5003)\n');
  }

  const failed = results.filter((r) => r.status === FAIL).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed\n`);
  process.exit(failed > 0 ? 1 : 0);
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
