const { verifyWebhookSignature } = require('../services/paystackService');
const { processPaystackWebhook } = require('../services/walletFundingService');
const {
  buildEventKey,
  logWebhookReceived,
  markWebhookProcessed,
} = require('../services/webhookLogService');

const handlePaystackWebhook = async (req, res) => {
  const signature = req.headers['x-paystack-signature'];
  const rawBody = req.rawBody || JSON.stringify(req.body);

  if (!verifyWebhookSignature(rawBody, signature)) {
    return res.status(401).json({ success: false, message: 'Invalid signature' });
  }

  const { event, data } = req.body || {};
  if (!event) {
    return res.status(400).json({ success: false, message: 'Missing event type' });
  }

  const eventKey = buildEventKey(event, data || {});

  try {
    const { duplicate } = await logWebhookReceived({ event, data, eventKey });

    if (duplicate) {
      return res.json({
        success: true,
        message: 'Duplicate webhook ignored',
        alreadyProcessed: true,
      });
    }

    const result = await processPaystackWebhook({ event, data: data || {} });

    const httpStatus = result.statusCode || 200;
    const logStatus = result.success
      ? (result.alreadyProcessed ? 'duplicate' : 'processed')
      : 'failed';

    await markWebhookProcessed(eventKey, {
      status: logStatus,
      message: result.message,
      httpStatus,
      error: result.success ? undefined : result.message,
    });

    if (!result.success && result.statusCode) {
      return res.status(result.statusCode).json({ success: false, message: result.message });
    }

    return res.json({
      success: true,
      message: result.message || 'Webhook processed',
      alreadyProcessed: result.alreadyProcessed || false,
    });
  } catch (error) {
    await markWebhookProcessed(eventKey, {
      status: 'failed',
      message: 'Webhook processing error',
      httpStatus: 500,
      error: error.message,
    }).catch(() => {});

    console.error('Webhook error:', error.message);
    return res.status(500).json({ success: false, message: 'Webhook processing failed' });
  }
};

module.exports = { handlePaystackWebhook };
