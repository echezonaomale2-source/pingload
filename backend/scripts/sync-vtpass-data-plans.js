#!/usr/bin/env node
/**
 * Sync all VTpass data plans and verify counts per network.
 * Usage: node scripts/sync-vtpass-data-plans.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const DataPlan = require('../src/models/DataPlan');
const { migrateDataPlanIndexes } = require('../src/utils/migrateDataPlanIndexes');
const { syncAllVtpassDataPlans, DATA_NETWORKS } = require('../src/services/vtpassDataPlanSyncService');

(async () => {
  await connectDB();
  await migrateDataPlanIndexes();
  console.log('Syncing VTpass data plans for all networks...\n');
  const results = await syncAllVtpassDataPlans();
  console.log('Sync results:', JSON.stringify(results, null, 2));

  console.log('\nDatabase counts (vtpass, enabled):');
  for (const network of DATA_NETWORKS) {
    const count = await DataPlan.countDocuments({ network, vtuProvider: 'vtpass', enabled: true });
    console.log(`  ${network}: ${count}`);
  }
  const total = await DataPlan.countDocuments({ vtuProvider: 'vtpass', enabled: true });
  console.log(`  TOTAL: ${total}`);

  await mongoose.disconnect();
  process.exit(total > 0 ? 0 : 1);
})().catch(async (err) => {
  console.error('Sync failed:', err.message);
  if (err.code === 11000) {
    console.error('Duplicate key:', JSON.stringify(err.keyValue));
  }
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
