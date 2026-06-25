const express = require('express');
const {
  buyAirtime,
  fetchDataPlans,
  buyData,
  payElectricity,
  verifyElectricityMeter,
  fetchTVPackages,
  verifyTVSmartcard,
  payTV,
  buyEducationPin,
  fetchEducationProducts,
  fundBetting,
  airtimeValidation,
  dataValidation,
  electricityValidation,
  electricityVerifyValidation,
  tvValidation,
  tvVerifyValidation,
  educationValidation,
  bettingValidation,
} = require('../controllers/vtuController');
const validate = require('../middleware/validate');
const idempotency = require('../middleware/idempotency');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.use(protect);

router.post('/airtime', idempotency('vtu:airtime'), airtimeValidation, validate, buyAirtime);
router.get('/data-plans/:network', fetchDataPlans);
router.post('/data', idempotency('vtu:data'), dataValidation, validate, buyData);
router.post('/electricity', idempotency('vtu:electricity'), electricityValidation, validate, payElectricity);
router.post('/electricity/verify', electricityVerifyValidation, validate, verifyElectricityMeter);
router.get('/tv-packages/:provider', fetchTVPackages);
router.post('/tv/verify', tvVerifyValidation, validate, verifyTVSmartcard);
router.post('/tv', idempotency('vtu:tv'), tvValidation, validate, payTV);
router.post('/education', idempotency('vtu:education'), educationValidation, validate, buyEducationPin);
router.get('/education-products', fetchEducationProducts);
router.post('/betting', idempotency('vtu:betting'), bettingValidation, validate, fundBetting);

module.exports = router;
