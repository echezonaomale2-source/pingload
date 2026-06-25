require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./src/config/db');
const { port, nodeEnv, corsOrigins } = require('./src/config/env');
const maintenanceMode = require('./src/middleware/maintenanceMode');
const errorHandler = require('./src/middleware/errorHandler');
const { apiLimiter } = require('./src/middleware/rateLimiter');

const authRoutes = require('./src/routes/authRoutes');
const walletRoutes = require('./src/routes/walletRoutes');
const vtuRoutes = require('./src/routes/vtuRoutes');
const transactionRoutes = require('./src/routes/transactionRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const referralRoutes = require('./src/routes/referralRoutes');
const webhookRoutes = require('./src/routes/webhookRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const kycRoutes = require('./src/routes/kycRoutes');
const faqRoutes = require('./src/routes/faqRoutes');
const pinRoutes = require('./src/routes/pinRoutes');
const serviceRoutes = require('./src/routes/serviceRoutes');
const devTestRoutes = require('./src/routes/devTestRoutes');
const seedAdmin = require('./src/utils/seedAdmin');
const serviceConfig = require('./src/config/serviceConfig');

const app = express();

app.set('trust proxy', 1);

// Capture raw body for Paystack webhook signature verification
app.use('/api/webhooks/paystack', express.raw({ type: 'application/json' }), (req, res, next) => {
  req.rawBody = req.body.toString();
  try {
    req.body = JSON.parse(req.rawBody);
  } catch {
    req.body = {};
  }
  next();
});

app.use(helmet());
app.use(cors({
  origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
  credentials: true,
}));
app.use(morgan(nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/webhooks/')) return next();
  return apiLimiter(req, res, next);
});
app.use('/api', maintenanceMode);

app.get('/health', (_req, res) => {
  res.json({ success: true, message: 'Pingload API is running', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/vtu', vtuRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/faq', faqRoutes);
app.use('/api/pin', pinRoutes);
app.use('/api/services', serviceRoutes);

if (serviceConfig.isDevelopment) {
  app.use('/api/dev', devTestRoutes);
}

app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use(errorHandler);

const startServer = async () => {
  await connectDB();
  await seedAdmin();

  const server = app.listen(port, '0.0.0.0', () => {
    serviceConfig.printStartupBanner();
    console.log(`Pingload API running on port ${port} [${nodeEnv}]`);
    if (serviceConfig.isDevelopment) {
      console.log(`Dev test routes: http://localhost:${port}/api/dev/samples`);
    }
  });

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Stop the other process or change PORT in .env`);
    } else {
      console.error(`Server error: ${error.message}`);
    }
    process.exit(1);
  });
};

startServer().catch((error) => {
  console.error('Failed to start server:', error.message);
  process.exit(1);
});

module.exports = app;
