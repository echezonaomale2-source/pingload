#!/usr/bin/env node
/**
 * Fix DataPlan collection indexes — drops legacy unique indexes that block VTpass sync.
 * Usage: node scripts/fix-dataplan-indexes.js [--dry-run]
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const { migrateDataPlanIndexes, isLegacyBlockingIndex } = require('../src/utils/migrateDataPlanIndexes');

const DRY_RUN = process.argv.includes('--dry-run');

(async () => {
  await connectDB();
  const collection = mongoose.connection.collection('dataplans');

  console.log('Current indexes:');
  (await collection.indexes()).forEach((idx) => {
    console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}${idx.unique ? ' [UNIQUE]' : ''}`);
  });

  if (DRY_RUN) {
    const toDrop = (await collection.indexes()).filter((idx) => isLegacyBlockingIndex(idx));
    console.log('\nWould drop:', toDrop.map((i) => i.name).join(', ') || '(none)');
  } else {
    const result = await migrateDataPlanIndexes();
    console.log('\nResult:', result);
    console.log('\nFinal indexes:');
    (await collection.indexes()).forEach((idx) => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}${idx.unique ? ' [UNIQUE]' : ''}`);
    });
  }

  await mongoose.disconnect();
})().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
