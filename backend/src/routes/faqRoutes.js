const express = require('express');
const { getFaqs } = require('../controllers/faqController');

const router = express.Router();

router.get('/', getFaqs);

module.exports = router;
