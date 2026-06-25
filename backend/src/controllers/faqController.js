const { body } = require('express-validator');
const Faq = require('../models/Faq');

const faqValidation = [
  body('question').trim().notEmpty().withMessage('Question is required'),
  body('answer').trim().notEmpty().withMessage('Answer is required'),
];

// GET /faq — public
const getFaqs = async (_req, res, next) => {
  try {
    const faqs = await Faq.find({ isActive: true }).sort({ order: 1, createdAt: 1 });
    res.json({ success: true, data: faqs });
  } catch (error) {
    next(error);
  }
};

// GET /faq/admin
const adminListFaqs = async (_req, res, next) => {
  try {
    const faqs = await Faq.find().sort({ order: 1, createdAt: 1 });
    res.json({ success: true, data: faqs });
  } catch (error) {
    next(error);
  }
};

// POST /faq/admin
const adminCreateFaq = async (req, res, next) => {
  try {
    const faq = await Faq.create(req.body);
    res.status(201).json({ success: true, data: faq });
  } catch (error) {
    next(error);
  }
};

// PATCH /faq/admin/:id
const adminUpdateFaq = async (req, res, next) => {
  try {
    const faq = await Faq.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!faq) return res.status(404).json({ success: false, message: 'FAQ not found' });
    res.json({ success: true, data: faq });
  } catch (error) {
    next(error);
  }
};

// DELETE /faq/admin/:id
const adminDeleteFaq = async (req, res, next) => {
  try {
    const faq = await Faq.findByIdAndDelete(req.params.id);
    if (!faq) return res.status(404).json({ success: false, message: 'FAQ not found' });
    res.json({ success: true, message: 'FAQ deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  faqValidation,
  getFaqs,
  adminListFaqs,
  adminCreateFaq,
  adminUpdateFaq,
  adminDeleteFaq,
};
