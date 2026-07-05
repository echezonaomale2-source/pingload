const Transaction = require('../models/Transaction');
const clubkonnect = require('./clubkonnectService');
const { finalizeTransaction } = require('./vtuPurchaseService');
const { logApiFailure, logClubkonnect } = require('../utils/logger');

const VTU_SERVICES = ['airtime', 'data', 'electricity', 'tv', 'education', 'betting', 'bulk_sms'];
const RECONCILE_INTERVAL_MS = Number(process.env.CLUBKONNECT_RECONCILE_INTERVAL_MS)
  || Number(process.env.VTPASS_RECONCILE_INTERVAL_MS)
  || 5 * 60 * 1000;
const MIN_AGE_MS = Number(process.env.CLUBKONNECT_RECONCILE_MIN_AGE_MS)
  || Number(process.env.VTPASS_RECONCILE_MIN_AGE_MS)
  || 2 * 60 * 1000;
const LOCK_MS = Number(process.env.CLUBKONNECT_RECONCILE_LOCK_MS)
  || Number(process.env.VTPASS_RECONCILE_LOCK_MS)
  || 3 * 60 * 1000;
const BATCH_SIZE = Number(process.env.CLUBKONNECT_RECONCILE_BATCH_SIZE)
  || Number(process.env.VTPASS_RECONCILE_BATCH_SIZE)
  || 20;

let reconcileTimer = null;
let reconcileRunning = false;

const pendingProviderRequestFilter = {
  $or: [
    { 'metadata.providerRequestId': { $exists: true, $ne: null } },
    { 'metadata.vtpassRequestId': { $exists: true, $ne: null } },
  ],
};

const getProviderRequestId = (metadata = {}) =>
  metadata.providerRequestId || metadata.vtpassRequestId || null;

const acquireReconciliationLock = async (transactionId) => {
  const lockUntil = new Date(Date.now() + LOCK_MS);
  return Transaction.findOneAndUpdate(
    {
      _id: transactionId,
      status: 'pending',
      service: { $in: VTU_SERVICES },
      $and: [
        pendingProviderRequestFilter,
        {
          $or: [
            { 'metadata.reconciliationLockUntil': { $exists: false } },
            { 'metadata.reconciliationLockUntil': { $lt: new Date() } },
          ],
        },
      ],
    },
    { $set: { 'metadata.reconciliationLockUntil': lockUntil } },
    { new: true }
  );
};

const reconcileOneTransaction = async (transaction) => {
  const requestId = getProviderRequestId(transaction.metadata);
  if (!requestId) return { skipped: true, reason: 'no_request_id' };

  const locked = await acquireReconciliationLock(transaction._id);
  if (!locked) return { skipped: true, reason: 'lock_not_acquired' };

  try {
    const result = await clubkonnect.requeryTransaction(requestId);
    const outcome = clubkonnect.resolvePurchaseOutcome(result);
    const purchaseDetails = clubkonnect.extractPurchaseDetails(result, locked.service);
    const finalizeMetadata = {
      providerResponse: result,
      providerOrderId: purchaseDetails.providerOrderId,
      purchaseDetails,
      reconciledAt: new Date(),
    };

    const fresh = await Transaction.findById(locked._id);
    if (!fresh || fresh.status !== 'pending') {
      return { skipped: true, reason: 'status_changed' };
    }

    if (outcome.outcome === 'pending') {
      fresh.metadata = { ...fresh.metadata, ...finalizeMetadata };
      await fresh.save();
      return { skipped: true, reason: 'still_pending' };
    }

    await finalizeTransaction(fresh, outcome.outcome === 'success', finalizeMetadata);

    logClubkonnect('info', 'Pending VTU transaction reconciled', {
      reference: fresh.reference,
      service: fresh.service,
      requestId,
      success: outcome.outcome === 'success',
      status: result?.status,
    });

    return { reconciled: true, success: outcome.outcome === 'success', reference: fresh.reference };
  } catch (error) {
    logApiFailure('clubkonnect:reconcile', error, {
      reference: locked.reference,
      service: locked.service,
      requestId,
    });
    return { error: error.message, reference: locked.reference };
  } finally {
    await Transaction.updateOne(
      { _id: locked._id },
      { $unset: { 'metadata.reconciliationLockUntil': '' } }
    ).catch(() => {});
  }
};

const runReconciliationCycle = async () => {
  if (reconcileRunning) return { skipped: true, reason: 'already_running' };
  reconcileRunning = true;

  try {
    const cutoff = new Date(Date.now() - MIN_AGE_MS);
    const pending = await Transaction.find({
      status: 'pending',
      service: { $in: VTU_SERVICES },
      createdAt: { $lte: cutoff },
      $and: [
        pendingProviderRequestFilter,
        {
          $or: [
            { 'metadata.reconciliationLockUntil': { $exists: false } },
            { 'metadata.reconciliationLockUntil': { $lt: new Date() } },
          ],
        },
      ],
    })
      .sort({ createdAt: 1 })
      .limit(BATCH_SIZE);

    if (!pending.length) {
      return { processed: 0 };
    }

    const results = [];
    for (const tx of pending) {
      // eslint-disable-next-line no-await-in-loop
      results.push(await reconcileOneTransaction(tx));
    }

    const reconciled = results.filter((r) => r.reconciled).length;
    const errors = results.filter((r) => r.error).length;

    if (reconciled > 0 || errors > 0) {
      console.log(`[Clubkonnect Reconcile] processed=${pending.length} reconciled=${reconciled} errors=${errors}`);
    }

    return { processed: pending.length, reconciled, errors, results };
  } finally {
    reconcileRunning = false;
  }
};

const startClubkonnectReconciliationWorker = () => {
  if (reconcileTimer) return;

  const tick = () => {
    runReconciliationCycle().catch((error) => {
      logApiFailure('clubkonnect:reconcile-cycle', error);
    });
  };

  reconcileTimer = setInterval(tick, RECONCILE_INTERVAL_MS);
  if (typeof reconcileTimer.unref === 'function') {
    reconcileTimer.unref();
  }

  setTimeout(tick, 30_000);
  console.log(`[Clubkonnect Reconcile] Worker started — interval ${RECONCILE_INTERVAL_MS / 1000}s`);
};

const stopClubkonnectReconciliationWorker = () => {
  if (reconcileTimer) {
    clearInterval(reconcileTimer);
    reconcileTimer = null;
  }
};

module.exports = {
  runReconciliationCycle,
  startClubkonnectReconciliationWorker,
  stopClubkonnectReconciliationWorker,
};
