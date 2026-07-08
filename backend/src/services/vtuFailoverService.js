const executeProviderCallWithFailover = async ({ providerCall }) => {
  const result = await providerCall('vtpass');
  return { result, providerName: 'vtpass', failovered: false };
};

module.exports = {
  executeProviderCallWithFailover,
};
