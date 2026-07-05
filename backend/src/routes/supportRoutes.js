const express = require('express');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const requireAppUnlock = require('../middleware/requireAppUnlock');
const {
  createTicketValidation,
  createTicket,
  listMyTickets,
  getMyTicket,
  replyToTicket,
} = require('../controllers/supportController');

const router = express.Router();

router.use(protect);
router.use(requireAppUnlock);

router.get('/tickets', listMyTickets);
router.post('/tickets', createTicketValidation, validate, createTicket);
router.get('/tickets/:id', getMyTicket);
router.post('/tickets/:id/reply', createTicketValidation.slice(1), validate, replyToTicket);

module.exports = router;
