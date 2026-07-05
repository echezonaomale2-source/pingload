const express = require('express');
const {
  getServicePrices,
  getDataPlans,
  getElectricityPlans,
  getBettingPlatforms,
  getTvPlans,
  getPublicServiceStatus,
  getAppConfig,
} = require('../controllers/serviceConfigController');

const {
  listProviderLogos,
  getProviderLogoImage,
} = require('../controllers/providerLogoController');
const { detectNetworkFromPhone } = require('../utils/networkDetection');

const router = express.Router();

router.get('/app-config', getAppConfig);
router.get('/prices', getServicePrices);
router.get('/status', getPublicServiceStatus);
router.get('/provider-logos', listProviderLogos);
router.get('/provider-logos/:providerId/image', getProviderLogoImage);
router.get('/detect-network', (req, res) => {
  const network = detectNetworkFromPhone(req.query.phone || '');
  res.json({
    success: true,
    data: {
      network,
      detected: Boolean(network),
    },
  });
});
router.get('/data-plans/:network', getDataPlans);
router.get('/electricity-plans', getElectricityPlans);
router.get('/betting-platforms', getBettingPlatforms);
router.get('/tv-plans/:provider', getTvPlans);

module.exports = router;
