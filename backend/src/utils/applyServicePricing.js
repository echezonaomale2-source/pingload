const ServicePrice = require('../models/ServicePrice');

const applyServicePricing = async (serviceId, amount) => {
  const pricing = await ServicePrice.findOne({ serviceId, enabled: true });
  if (!pricing) return amount;

  let finalAmount = amount;
  if (pricing.discountPercent > 0) {
    finalAmount -= (finalAmount * pricing.discountPercent) / 100;
  }
  if (pricing.markupPercent > 0) {
    finalAmount += (amount * pricing.markupPercent) / 100;
  }

  return Math.max(0, Math.round(finalAmount * 100) / 100);
};

module.exports = applyServicePricing;
