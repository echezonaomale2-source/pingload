require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
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
const supportRoutes = require('./src/routes/supportRoutes');
const webhookRoutes = require('./src/routes/webhookRoutes');
const adminRoutes = require('./src/routes/adminRoutes');
const kycRoutes = require('./src/routes/kycRoutes');
const faqRoutes = require('./src/routes/faqRoutes');
const pinRoutes = require('./src/routes/pinRoutes');
const serviceRoutes = require('./src/routes/serviceRoutes');
const devTestRoutes = require('./src/routes/devTestRoutes');
const legalRoutes = require('./src/routes/legalRoutes');
const seedAdmin = require('./src/utils/seedAdmin');
const { migrateDataPlanIndexes } = require('./src/utils/migrateDataPlanIndexes');
const { migrateTvPlanIndexes } = require('./src/utils/migrateTvPlanIndexes');
const { migrateElectricityPlanIndexes } = require('./src/utils/migrateElectricityPlanIndexes');
const { migrateEducationProductIndexes } = require('./src/utils/migrateEducationProductIndexes');
const { migrateLegacyVtuProviders } = require('./src/utils/migrateLegacyVtuProviders');
const serviceConfig = require('./src/config/serviceConfig');
const { initializeFcm } = require('./src/services/fcmService');
const { verifyVtpassConnectivity } = require('./src/services/vtpassService');
const { syncBettingPlatforms } = require('./src/services/bettingPlatformService');
const { syncAllVtpassDataPlans } = require('./src/services/vtpassDataPlanSyncService');
const DataPlan = require('./src/models/DataPlan');
const { startVtpassReconciliationWorker } = require('./src/services/vtpassReconciliationWorker');
const SystemSettings = require('./src/models/SystemSettings');
const { persistProviderHealth } = require('./src/utils/providerHealth');

const runSafe = async (label, fn) => {
  try {
    return await fn();
  } catch (error) {
    // Catalog/index repairs must never take down the API process.
    console.error(`[Startup] ${label} failed (continuing): ${error.message}`);
    return null;
  }
};

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

app.use(helmet({
  contentSecurityPolicy: nodeEnv === 'production',
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: corsOrigins.length === 1 ? corsOrigins[0] : corsOrigins,
  credentials: true,
}));
app.use(morgan(nodeEnv === 'development' ? 'dev' : 'combined'));
// Avatar uploads are base64 data URIs (~350KB). Default express.json limit is 100kb.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(mongoSanitize());
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/webhooks/')) return next();
  return apiLimiter(req, res, next);
});
app.use('/api', maintenanceMode);

app.get('/health', async (_req, res) => {
  const { verifyFirebaseConfig, verifyFirebaseLiveAuth } = require('./src/services/fcmService');
  const fcm = verifyFirebaseConfig();
  let live = null;
  try {
    live = await verifyFirebaseLiveAuth();
  } catch (error) {
    live = { liveOk: false, reason: error.message };
  }
  res.json({
    success: true,
    message: 'Pingload API is running',
    timestamp: new Date().toISOString(),
    fcm: {
      configured: fcm.configured,
      ok: fcm.ok,
      liveOk: Boolean(live?.liveOk),
      projectId: fcm.projectId || null,
      expectedProjectId: fcm.expectedProjectId || 'pingload',
      source: fcm.source || null,
      reason: live?.liveOk ? null : (live?.reason || fcm.reason || null),
    },
  });
});

app.get('/api/health', async (_req, res) => {
  const { verifyFirebaseConfig, verifyFirebaseLiveAuth } = require('./src/services/fcmService');
  const fcm = verifyFirebaseConfig();
  let live = null;
  try {
    live = await verifyFirebaseLiveAuth();
  } catch (error) {
    live = { liveOk: false, reason: error.message };
  }
  res.json({
    success: true,
    message: 'Pingload API is running',
    timestamp: new Date().toISOString(),
    fcm: {
      configured: fcm.configured,
      ok: fcm.ok,
      liveOk: Boolean(live?.liveOk),
      projectId: fcm.projectId || null,
      expectedProjectId: fcm.expectedProjectId || 'pingload',
      source: fcm.source || null,
      reason: live?.liveOk ? null : (live?.reason || fcm.reason || null),
    },
  });
});

app.use(legalRoutes);

app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/vtu', vtuRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/support', supportRoutes);
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

  const indexResult = await runSafe('DataPlan index migration', migrateDataPlanIndexes) || { dropped: [] };
  const tvIndexResult = await runSafe('TvPlan index migration', migrateTvPlanIndexes) || { dropped: [] };
  if (tvIndexResult.dropped?.length > 0) {
    console.log(`[TvPlan] Migrated indexes — dropped: ${tvIndexResult.dropped.join(', ')}`);
  }
  const electricityIndexResult = await runSafe(
    'ElectricityPlan index migration',
    migrateElectricityPlanIndexes
  ) || { dropped: [] };
  if (electricityIndexResult.dropped?.length > 0) {
    console.log(`[ElectricityPlan] Migrated indexes — dropped: ${electricityIndexResult.dropped.join(', ')}`);
  }
  const educationIndexResult = await runSafe(
    'EducationProduct index migration',
    migrateEducationProductIndexes
  ) || { dropped: [], removedDuplicates: 0 };
  if (educationIndexResult.removedDuplicates > 0 || educationIndexResult.dropped?.length > 0) {
    console.log(
      `[EducationProduct] Migration complete — removed ${educationIndexResult.removedDuplicates || 0} duplicate(s), dropped indexes: ${(educationIndexResult.dropped || []).join(', ') || 'none'}`
    );
  }

  await runSafe('Legacy VTU provider migration', migrateLegacyVtuProviders);
  await seedAdmin();

  if (serviceConfig.vtpass.configured) {
    const vtpassPlanCount = await DataPlan.countDocuments({ vtuProvider: 'vtpass' });
    const needsSync = vtpassPlanCount === 0 || indexResult.dropped.length > 0;
    if (needsSync) {
      console.log('[VTU] Running VTpass data plan sync...');
      await runSafe('VTpass data plan sync', async () => {
        const syncResult = await syncAllVtpassDataPlans();
        console.log(`[VTU] VTpass data plan sync complete — ${syncResult.total} plan(s) saved.`);
        return syncResult;
      });
    }
  }

  const fcmStatus = await initializeFcm();
  if (!fcmStatus.configured) {
    console.warn('[FCM] Push notifications OFF — Firebase credentials not configured.');
  } else if (fcmStatus.liveOk) {
    console.log(`[FCM] Push notifications ON — live Google auth OK for project "${fcmStatus.projectId}".`);
  } else {
    console.error(`[FCM] Push notifications DISABLED — ${fcmStatus.reason || 'Firebase credential validation failed'}. The API will keep running; fix FIREBASE_SERVICE_ACCOUNT_JSON / FIREBASE_PRIVATE_KEY on Render.`);
  }

  const vtpassStatus = await verifyVtpassConnectivity();
  const { validateVtpassKeyFormats } = require('./src/utils/vtpassKeyUtils');
  const keyValidation = validateVtpassKeyFormats(serviceConfig.vtpass);
  if (serviceConfig.vtpass.configured && !keyValidation.valid) {
    console.warn(`[VTpass] Key format issues: ${keyValidation.issues.join('; ')}`);
  }
  if (!vtpassStatus.configured) {
    console.warn('[VTpass] Credentials not configured.');
  } else if (vtpassStatus.ok) {
    console.log(`[VTpass] Connected — ${vtpassStatus.baseUrl} (${vtpassStatus.mode}).`);
    if (vtpassStatus.balance != null) {
      console.log(`[VTpass] Wallet balance: ₦${vtpassStatus.balance}`);
    } else if (vtpassStatus.balanceError) {
      console.warn(`[VTpass] Wallet balance unavailable: ${vtpassStatus.balanceError}`);
    }
  } else {
    console.error(`[VTpass] Connection issue — ${vtpassStatus.reason}`);
    if (vtpassStatus.serverIp) {
      console.error(`[VTpass] Whitelist this outbound IP: ${vtpassStatus.serverIp}`);
    }
  }
  if (vtpassStatus.configured) {
    await persistProviderHealth('vtpass', vtpassStatus);
  }

  const settings = await SystemSettings.getSettings();
  const vtuProvider = require('./src/services/vtuProviderService');
  const effectiveProvider = await vtuProvider.getActiveProviderName();
  console.log(`[VTU] Provider: ${settings.vtuProvider}, effective: ${effectiveProvider}`);

  if (serviceConfig.vtpass.configured) {
    await runSafe('Betting platform sync', async () => {
      const bettingSync = await syncBettingPlatforms();
      if (bettingSync.synced > 0) {
        console.log(`[Betting] Synced ${bettingSync.synced} platform(s) from VTpass.`);
      }
      return bettingSync;
    });
    startVtpassReconciliationWorker();
  }

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
