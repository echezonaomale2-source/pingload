const express = require('express');
const path = require('path');

const router = express.Router();
const publicDir = path.join(__dirname, '../../public');

router.use('/css', express.static(path.join(publicDir, 'css'), { maxAge: '1d' }));

router.get('/privacy', (_req, res) => {
  res.type('html').sendFile(path.join(publicDir, 'privacy.html'));
});

router.get('/terms', (_req, res) => {
  res.type('html').sendFile(path.join(publicDir, 'terms.html'));
});

module.exports = router;
