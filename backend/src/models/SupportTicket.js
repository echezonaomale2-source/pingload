const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], required: true },
    message: { type: String, required: true },
  },
  { timestamps: true }
);

const supportTicketSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: String, required: true },
    status: { type: String, enum: ['open', 'resolved', 'closed'], default: 'open' },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
    messages: [messageSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
