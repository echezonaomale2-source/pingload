const mongoose = require('mongoose');

const servicePriceSchema = new mongoose.Schema(
  {
    serviceId: {
      type: String,
      enum: ['airtime', 'data', 'electricity', 'tv', 'education'],
      required: true,
      unique: true,
    },
    name: { type: String, required: true },
    basePrice: { type: Number, default: 0 },
    discountPercent: { type: Number, default: 0, min: 0, max: 100 },
    markupPercent: { type: Number, default: 0, min: 0 },
    minAmount: { type: Number, default: 50 },
    maxAmount: { type: Number, default: 500000 },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true }
);

servicePriceSchema.statics.getDefaults = () => [
  { serviceId: 'airtime', name: 'Airtime', minAmount: 50, maxAmount: 50000 },
  { serviceId: 'data', name: 'Data', minAmount: 100, maxAmount: 50000 },
  { serviceId: 'electricity', name: 'Electricity', minAmount: 500, maxAmount: 500000 },
  { serviceId: 'tv', name: 'TV Subscription', minAmount: 900, maxAmount: 50000 },
  { serviceId: 'education', name: 'Education Pins', minAmount: 1000, maxAmount: 50000 },
];

servicePriceSchema.statics.ensureDefaults = async function () {
  const defaults = this.getDefaults();
  for (const item of defaults) {
    await this.findOneAndUpdate({ serviceId: item.serviceId }, { $setOnInsert: item }, { upsert: true });
  }
};

module.exports = mongoose.model('ServicePrice', servicePriceSchema);
