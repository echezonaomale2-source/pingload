const express = require('express');
const { getServiceConfig, getSampleRequests, getHealth } = require('../controllers/devTestController');

const router = express.Router();

router.get('/config', getServiceConfig);
router.get('/samples', getSampleRequests);
router.get('/health', getHealth);

module.exports = router;
