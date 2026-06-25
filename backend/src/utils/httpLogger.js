const { logPaystack, logVtpass } = require('./logger');

const attachPaystackLogger = (client) => {
  client.interceptors.request.use((config) => {
    logPaystack('request', `${(config.method || 'GET').toUpperCase()} ${config.url}`, {
      data: config.data,
    });
    return config;
  });

  client.interceptors.response.use(
    (response) => {
      logPaystack('response', `${response.status} ${response.config.url}`, {
        data: response.data,
      });
      return response;
    },
    (error) => {
      logPaystack('error', error.config?.url || 'request failed', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      return Promise.reject(error);
    }
  );

  return client;
};

const attachVtpassLogger = (client) => {
  client.interceptors.request.use((config) => {
    logVtpass('request', `${(config.method || 'GET').toUpperCase()} ${config.url}`, {
      params: config.params,
      data: config.data,
    });
    return config;
  });

  client.interceptors.response.use(
    (response) => {
      logVtpass('response', `${response.status} ${response.config.url}`, {
        data: response.data,
      });
      return response;
    },
    (error) => {
      logVtpass('error', error.config?.url || 'request failed', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
      return Promise.reject(error);
    }
  );

  return client;
};

module.exports = { attachPaystackLogger, attachVtpassLogger };
