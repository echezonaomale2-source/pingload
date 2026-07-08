const mongoose = require('mongoose');

/**
 * One-time migration: set legacy clubkonnect provider fields to vtpass.
 */
const migrateLegacyVtuProviders = async () => {
  const collections = [
    { name: 'dataplans', filter: { vtuProvider: 'clubkonnect' } },
    { name: 'tvplans', filter: { vtuProvider: 'clubkonnect' } },
    { name: 'electricityplans', filter: { vtuProvider: 'clubkonnect' } },
    { name: 'educationproducts', filter: { vtuProvider: 'clubkonnect' } },
  ];

  let total = 0;
  for (const { name, filter } of collections) {
    try {
      const result = await mongoose.connection.collection(name).updateMany(
        filter,
        { $set: { vtuProvider: 'vtpass' } }
      );
      if (result.modifiedCount > 0) {
        console.log(`[Migration] ${name}: updated ${result.modifiedCount} legacy clubkonnect record(s) to vtpass`);
        total += result.modifiedCount;
      }
    } catch (error) {
      if (error.codeName !== 'NamespaceNotFound') {
        console.warn(`[Migration] ${name}: ${error.message}`);
      }
    }
  }

  if (total === 0) {
    console.log('[Migration] No legacy clubkonnect catalog records to update.');
  }

  return { updated: total };
};

module.exports = { migrateLegacyVtuProviders };
