#!/usr/bin/env node
/**
 * VTpass end-to-end verification — prints masked config and raw API responses.
 * Usage: node scripts/verify-vtpass.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const serviceConfig = require('../src/config/serviceConfig');
const vtpass = require('../src/services/vtpassService');

const mask = (v) => {
  if (!v) return '(not set)';
  if (v.length <= 10) return '****';
  return `${v.slice(0, 6)}...${v.slice(-4)}`;
};

const section = (title) => {
  console.log('\n' + '='.repeat(60));
  console.log(title);
  console.log('='.repeat(60));
};

const printJson = (label, data) => {
  console.log(`\n--- ${label} ---`);
  console.log(JSON.stringify(data, null, 2));
};

(async () => {
  section('ENV CONFIG (masked)');
  console.log({
    NODE_ENV: process.env.NODE_ENV,
    SERVICE_MODE: process.env.SERVICE_MODE,
    VTPASS_ENV: process.env.VTPASS_ENV,
    VTPASS_BASE_URL: serviceConfig.vtpass.baseUrl,
    VTPASS_API_KEY: mask(process.env.VTPASS_API_KEY),
    VTPASS_PUBLIC_KEY: mask(process.env.VTPASS_PUBLIC_KEY),
    VTPASS_SECRET_KEY: mask(process.env.VTPASS_SECRET_KEY),
    configured: serviceConfig.vtpass.configured,
    mode: serviceConfig.vtpass.mode,
  });

  section('1. CONNECTIVITY / AUTH PROBE (POST /merchant-verify)');
  try {
    const connectivity = await vtpass.verifyVtpassConnectivity();
    printJson('verifyVtpassConnectivity result', connectivity);
  } catch (err) {
    printJson('verifyVtpassConnectivity error', {
      message: err.message,
      statusCode: err.statusCode,
      vtpassCode: err.vtpassCode,
      vtpassResponse: err.vtpassResponse,
    });
  }

  section('2. WALLET BALANCE (GET /balance)');
  try {
    const balance = await vtpass.getWalletBalance();
    printJson('getWalletBalance result', balance);
  } catch (err) {
    printJson('getWalletBalance error', {
      message: err.message,
      statusCode: err.statusCode,
      vtpassCode: err.vtpassCode,
      vtpassResponse: err.vtpassResponse || err.response?.data,
    });
  }

  section('3. DATA PLANS — MTN (GET /service-variations?serviceID=mtn-data)');
  try {
    const plans = await vtpass.getDataPlans('mtn');
    const variationCount = plans?.content?.variations?.length ?? 0;
    printJson('getDataPlans summary', {
      code: plans?.code,
      response_description: plans?.response_description,
      variationCount,
      firstThree: (plans?.content?.variations || []).slice(0, 3),
    });
    if (variationCount === 0) {
      printJson('getDataPlans full response', plans);
    }
  } catch (err) {
    printJson('getDataPlans error', {
      message: err.message,
      statusCode: err.statusCode,
      vtpassCode: err.vtpassCode,
      vtpassResponse: err.vtpassResponse || err.response?.data,
    });
  }

  process.exit(0);
})().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
