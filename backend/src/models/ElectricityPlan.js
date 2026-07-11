const mongoose = require('mongoose');

const electricityPlanSchema = new mongoose.Schema(
  {
    providerId: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    name: { type: String, required: true, trim: true },
    providerServiceId: { type: String, required: true, trim: true },
    vtpassServiceId: { type: String, trim: true, select: false },
    minAmount: { type: Number, default: 500, min: 0 },
    maxAmount: { type: Number, default: 500000, min: 0 },
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    vtuProvider: {
      type: String,
      enum: ['vtpass'],
      default: 'vtpass',
    },
  },
  { timestamps: true }
);

electricityPlanSchema.index({ providerId: 1, vtuProvider: 1 }, { unique: true });
electricityPlanSchema.index({ providerId: 1 });
electricityPlanSchema.index({ vtuProvider: 1 });
electricityPlanSchema.index({ providerServiceId: 1 }, { sparse: true });

electricityPlanSchema.statics.ensureDefaults = async function ensureDefaults() {
  const { upsertElectricityPlanFromSync } = require('../utils/electricityPlanUpsert');
  const defaults = [
    { providerId: 'ikeja', name: 'Ikeja Electric (IKEDC)', providerServiceId: 'ikeja-electric', order: 1 },
    { providerId: 'eko', name: 'Eko Electric (EKEDC)', providerServiceId: 'eko-electric', order: 2 },
    { providerId: 'abuja', name: 'Abuja Electric (AEDC)', providerServiceId: 'abuja-electric', order: 3 },
    { providerId: 'ibadan', name: 'Ibadan Electric (IBEDC)', providerServiceId: 'ibadan-electric', order: 4 },
    { providerId: 'kano', name: 'Kano Electric (KEDCO)', providerServiceId: 'kano-electric', order: 5 },
    { providerId: 'jos', name: 'Jos Electric (JED)', providerServiceId: 'jos-electric', order: 6 },
    { providerId: 'benin', name: 'Benin Electric (BEDC)', providerServiceId: 'benin-electric', order: 7 },
    { providerId: 'enugu', name: 'Enugu Electric (EEDC)', providerServiceId: 'enugu-electric', order: 8 },
    { providerId: 'portharcourt', name: 'Port Harcourt Electric (PHED)', providerServiceId: 'portharcourt-electric', order: 9 },
    { providerId: 'kaduna', name: 'Kaduna Electric (KAEDCO)', providerServiceId: 'kaduna-electric', order: 10 },
  ];

  for (const item of defaults) {
    const existing = await this.findOne({
      providerId: item.providerId,
      vtuProvider: 'vtpass',
    }).select('_id');
    if (existing) continue;
    await upsertElectricityPlanFromSync({
      ...item,
      vtpassServiceId: item.providerServiceId,
      enabled: true,
      vtuProvider: 'vtpass',
    });
  }
};

module.exports = mongoose.model('ElectricityPlan', electricityPlanSchema);
