const mongoose = require('mongoose');

const electricityPlanSchema = new mongoose.Schema(
  {
    providerId: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
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
      index: true,
    },
  },
  { timestamps: true }
);

electricityPlanSchema.index({ providerId: 1, vtuProvider: 1 }, { unique: true });

electricityPlanSchema.statics.ensureDefaults = async function ensureDefaults() {
  const count = await this.countDocuments();
  if (count > 0) return;

  await this.insertMany([
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
  ]);
};

module.exports = mongoose.model('ElectricityPlan', electricityPlanSchema);
