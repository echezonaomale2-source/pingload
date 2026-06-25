const express = require('express');
const { handlePaystackWebhook } = require('../controllers/webhookController');

const router = express.Router();

router.post('/paystack', handlePaystackWebhook);

module.exports = router;
