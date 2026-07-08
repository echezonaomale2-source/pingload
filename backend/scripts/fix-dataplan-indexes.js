#!/usr/bin/env node
/**
 * Fix DataPlan collection indexes — drops legacy unique indexes and dedupes plans.
 * Usage: node scripts/fix-dataplan-indexes.js [--dry-run]
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const {
  migrateDataPlanIndexes,
  migrateInvalidDataPlans,
  verifyUniqueDataPlans,
  isLegacyBlockingIndex,
} = require('../src/utils/migrateDataPlanIndexes');

const DRY_RUN = process.argv.includes('--dry-run');

(async () => {
  await connectDB();
  const collection = mongoose.connection.collection('dataplans');

  console.log('Current indexes:');
  (await collection.indexes()).forEach((idx) => {
    console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}${idx.unique ? ' [UNIQUE]' : ''}`);
  });

  const verification = await verifyUniqueDataPlans(collection);
  if (!verification.ok) {
    console.log('\nDuplicate groups found:', verification.issues.join('; '));
  } else {
    console.log('\nNo duplicate plan groups detected.');
  }

  if (DRY_RUN) {
    const toDrop = (await collection.indexes()).filter((idx) => isLegacyBlockingIndex(idx));
    const invalidCount = await collection.countDocuments({
      $or: [
        { providerPlanCode: null },
        { providerPlanCode: { $exists: false } },
        { providerPlanCode: '' },
        { vtuProvider: null },
        { vtuProvider: { $exists: false } },
      ],
    });
    console.log('\nWould drop:', toDrop.map((i) => i.name).join(', ') || '(none)');
    console.log(`Invalid dataplans to clean: ${invalidCount}`);
  } else {
    const result = await migrateDataPlanIndexes();
    console.log('\nResult:', result);
    const finalVerification = await verifyUniqueDataPlans(collection);
    console.log('\nVerification:', finalVerification.ok ? 'unique plans OK' : finalVerification.issues.join('; '));
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
