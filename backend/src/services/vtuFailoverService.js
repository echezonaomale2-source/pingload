const vtuProvider = require('./vtuProviderService');
const routing = require('./vtuRoutingService');
const ProviderFailoverLog = require('../models/ProviderFailoverLog');
const { logVtpass, logClubkonnect } = require('../utils/logger');

const logProviderError = (providerName, level, message, meta = {}) => {
  if (providerName === 'vtpass') logVtpass(level, message, meta);
  else logClubkonnect(level, message, meta);
};

const isRetryableProviderError = (error) => {
  const status = error?.statusCode || error?.response?.status;
  if (status === 400 || status === 401 || status === 403 || status === 404) return false;
  return true;
};

const executeProviderCallWithFailover = async ({
  service,
  primaryProvider,
  providerCall,
  transactionReference = '',
}) => {
  try {
    const result = await providerCall(primaryProvider);
    return { result, providerName: primaryProvider, failovered: false };
  } catch (primaryError) {
    const failoverEnabled = await routing.getFailoverEnabled();
    const alternate = routing.getAlternateProvider(primaryProvider);

    if (
      !failoverEnabled
      || !routing.isProviderConfigured(alternate)
      || !isRetryableProviderError(primaryError)
    ) {
      throw primaryError;
    }

    const settings = await routing.loadSettings();
    if (!routing.isProviderEnabled(alternate, settings)) {
      throw primaryError;
    }

    logProviderError(primaryProvider, 'warn', 'VTU provider failed — attempting failover', {
      service,
      alternate,
      message: primaryError.message,
    });

    try {
      const result = await providerCall(alternate);
      await ProviderFailoverLog.create({
        service,
        primaryProvider,
        fallbackProvider: alternate,
        success: true,
        errorMessage: primaryError.message,
        transactionReference,
      });
      return { result, providerName: alternate, failovered: true, primaryError: primaryError.message };
    } catch (fallbackError) {
      await ProviderFailoverLog.create({
        service,
        primaryProvider,
        fallbackProvider: alternate,
        success: false,
        errorMessage: `${primaryError.message} | fallback: ${fallbackError.message}`,
        transactionReference,
      });
      throw primaryError;
    }
  }
};

module.exports = {
  executeProviderCallWithFailover,
};
