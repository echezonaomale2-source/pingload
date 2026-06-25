const express = require('express');
const { getServicePrices, getDataPlans, getPublicServiceStatus, getAppConfig } = require('../controllers/serviceConfigController');

const router = express.Router();

router.get('/app-config', getAppConfig);
router.get('/prices', getServicePrices);
router.get('/status', getPublicServiceStatus);
router.get('/data-plans/:network', getDataPlans);

module.exports = router;
