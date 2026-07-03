const express = require('express');
const {
  getServicePrices,
  getDataPlans,
  getElectricityPlans,
  getTvPlans,
  getPublicServiceStatus,
  getAppConfig,
} = require('../controllers/serviceConfigController');

const router = express.Router();

router.get('/app-config', getAppConfig);
router.get('/prices', getServicePrices);
router.get('/status', getPublicServiceStatus);
router.get('/data-plans/:network', getDataPlans);
router.get('/electricity-plans', getElectricityPlans);
router.get('/tv-plans/:provider', getTvPlans);

module.exports = router;
