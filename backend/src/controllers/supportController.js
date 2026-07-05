const { body } = require('express-validator');
const SupportTicket = require('../models/SupportTicket');

const createTicketValidation = [
  body('subject').trim().notEmpty().withMessage('Subject is required').isLength({ max: 200 }),
  body('message').trim().notEmpty().withMessage('Message is required').isLength({ max: 5000 }),
  body('priority').optional().isIn(['low', 'medium', 'high']),
];

const createTicket = async (req, res, next) => {
  try {
    const { subject, message, priority = 'medium' } = req.body;
    const ticket = await SupportTicket.create({
      userId: req.user._id,
      subject,
      priority,
      messages: [{ sender: req.user.fullName || 'User', role: 'user', message }],
    });

    res.status(201).json({
      success: true,
      message: 'Support ticket created',
      data: {
        id: ticket._id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

const listMyTickets = async (req, res, next) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.user._id })
      .select('subject status priority createdAt updatedAt')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, data: tickets });
  } catch (error) {
    next(error);
  }
};

const getMyTicket = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    res.json({ success: true, data: ticket });
  } catch (error) {
    next(error);
  }
};

const replyToTicket = async (req, res, next) => {
  try {
    const { message } = req.body;
    const ticket = await SupportTicket.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    if (ticket.status === 'closed') {
      return res.status(400).json({ success: false, message: 'This ticket is closed' });
    }

    ticket.messages.push({
      sender: req.user.fullName || 'User',
      role: 'user',
      message,
    });
    if (ticket.status === 'resolved') ticket.status = 'open';
    await ticket.save();

    res.json({ success: true, message: 'Reply sent', data: ticket });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTicketValidation,
  createTicket,
  listMyTickets,
  getMyTicket,
  replyToTicket,
};
