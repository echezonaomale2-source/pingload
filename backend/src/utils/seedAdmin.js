const Admin = require('../models/Admin');
const SystemSettings = require('../models/SystemSettings');
const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const Faq = require('../models/Faq');
const ServicePrice = require('../models/ServicePrice');
const DataPlan = require('../models/DataPlan');
const EducationProduct = require('../models/EducationProduct');
const { adminEmail, adminPassword } = require('../config/env');

const seedAdmin = async () => {
  if (!adminPassword) {
    throw new Error('ADMIN_PASSWORD must be set to seed the admin account');
  }

  const existing = await Admin.findOne({ email: adminEmail });
  if (!existing) {
    await Admin.create({
      name: 'Super Admin',
      email: adminEmail,
      passwordHash: adminPassword,
      role: 'superadmin',
    });
    console.log(`Admin seeded: ${adminEmail}`);
  }

  await SystemSettings.getSettings();
  await ServicePrice.ensureDefaults();
  await EducationProduct.ensureDefaults();

  const faqCount = await Faq.countDocuments();
  if (faqCount === 0) {
    await Faq.insertMany([
      { question: 'How do I fund my wallet?', answer: 'Go to Wallet tab and tap Fund Wallet. You can pay via Paystack with your debit card or bank transfer.', order: 1 },
      { question: 'What is a transaction PIN?', answer: 'A 4-digit PIN required to authorize purchases and transfers. Set it up in Profile > Security > Transaction PIN.', order: 2 },
      { question: 'How long does KYC verification take?', answer: 'KYC reviews are typically completed within 24-48 hours after you submit your documents.', order: 3 },
      { question: 'Can I get a refund?', answer: 'Failed transactions are automatically refunded to your wallet. For other issues, contact support.', order: 4 },
    ]);
    console.log('Default FAQs seeded');
  }

  const planCount = await DataPlan.countDocuments();
  if (planCount === 0) {
    await DataPlan.insertMany([
      { network: 'mtn', name: 'MTN 1GB', dataSize: '1GB', validity: '30 days', variationCode: 'mtn-1gb', amount: 350, order: 1 },
      { network: 'mtn', name: 'MTN 2GB', dataSize: '2GB', validity: '30 days', variationCode: 'mtn-2gb', amount: 700, order: 2 },
      { network: 'airtel', name: 'Airtel 1.5GB', dataSize: '1.5GB', validity: '30 days', variationCode: 'airtel-1.5gb', amount: 500, order: 1 },
      { network: 'glo', name: 'Glo 1GB', dataSize: '1GB', validity: '14 days', variationCode: 'glo-1gb', amount: 300, order: 1 },
      { network: '9mobile', name: '9mobile 1GB', dataSize: '1GB', validity: '30 days', variationCode: '9mobile-1gb', amount: 400, order: 1 },
    ]);
    console.log('Default data plans seeded');
  }

  const ticketCount = await SupportTicket.countDocuments();
  if (ticketCount === 0) {
    const sampleUser = await User.findOne();
    if (sampleUser) {
      await SupportTicket.create([
        {
          userId: sampleUser._id,
          subject: 'Failed TV subscription payment',
          status: 'open',
          priority: 'high',
          messages: [
            { sender: sampleUser.fullName, role: 'user', message: 'I paid for DStv Compact but my subscription was not renewed.' },
          ],
        },
      ]);
      console.log('Sample support tickets seeded');
    }
  }
};

module.exports = seedAdmin;
