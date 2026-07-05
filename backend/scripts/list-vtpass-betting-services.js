/**
 * List VTpass services and probe betting platform IDs.
 * Usage: node scripts/list-vtpass-betting-services.js
 */
require('dotenv').config();
const serviceConfig = require('../src/config/serviceConfig');
const vtpass = require('../src/services/vtpassService');
const { syncBettingPlatformsFromVtpass } = require('../src/services/bettingPlatformService');

async function main() {
  console.log(`VTpass mode: ${serviceConfig.vtpass.mode}`);
  console.log(`VTpass base: ${serviceConfig.vtpass.baseUrl}\n`);

  if (!serviceConfig.vtpass.configured) {
    console.error('VTpass API keys are not configured.');
    process.exit(1);
  }

  const services = await vtpass.listAllServices();
  console.log(`All services (${services.length}):`);
  services.forEach((service) => {
    console.log(`- ${service.serviceID} :: ${service.name}`);
  });

  console.log('\nProbing catalog platform IDs...');
  const catalog = require('../src/config/bettingPlatformCatalog');
  for (const entry of catalog) {
    const probe = await vtpass.probeBettingServiceId(entry.platformId);
    console.log(`${entry.platformId}: ${probe ? probe.serviceID : 'not found'}`);
  }

  console.log('\nSyncing betting platforms...');
  const sync = await syncBettingPlatformsFromVtpass();
  console.log(JSON.stringify(sync, null, 2));
  process.exit(sync.synced > 0 ? 0 : 1);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
