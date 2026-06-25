const WebhookLog = require('../models/WebhookLog');

const buildEventKey = (event, data = {}) => {
  const ref = data.reference || data.transfer_code || data.id || '';
  return `${event}:${ref}:${data.id || ''}`;
};

const logWebhookReceived = async ({ event, data, eventKey }) => {
  const key = eventKey || buildEventKey(event, data);
  try {
    const log = await WebhookLog.create({
      provider: 'paystack',
      event,
      eventKey: key,
      reference: data?.reference || data?.transfer_code || null,
      status: 'received',
      payloadSummary: {
        amount: data?.amount ? data.amount / 100 : undefined,
        currency: data?.currency,
        customerEmail: data?.customer?.email,
        transferCode: data?.transfer_code,
      },
    });
    return { log, duplicate: false };
  } catch (error) {
    if (error.code === 11000) {
      return { log: null, duplicate: true, eventKey: key };
    }
    throw error;
  }
};

const markWebhookProcessed = async (eventKey, { status = 'processed', message, httpStatus, error } = {}) => {
  await WebhookLog.findOneAndUpdate(
    { eventKey },
    {
      $set: {
        status,
        resultMessage: message,
        httpStatus,
        error,
        processedAt: new Date(),
      },
    }
  );
};

module.exports = {
  buildEventKey,
  logWebhookReceived,
  markWebhookProcessed,
};
