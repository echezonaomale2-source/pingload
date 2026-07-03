const mongoose = require('mongoose');

const electricityPlanSchema = new mongoose.Schema(
  {
    providerId: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    vtpassServiceId: { type: String, required: true, trim: true },
    minAmount: { type: Number, default: 500, min: 0 },
    maxAmount: { type: Number, default: 500000, min: 0 },
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

electricityPlanSchema.statics.ensureDefaults = async function ensureDefaults() {
  const count = await this.countDocuments();
  if (count > 0) return;

  await this.insertMany([
    { providerId: 'ikeja', name: 'Ikeja Electric', vtpassServiceId: 'ikeja-electric', order: 1 },
    { providerId: 'eko', name: 'Eko Electric', vtpassServiceId: 'eko-electric', order: 2 },
    { providerId: 'abuja', name: 'Abuja Electric', vtpassServiceId: 'abuja-electric', order: 3 },
    { providerId: 'kaduna', name: 'Kaduna Electric', vtpassServiceId: 'kaduna-electric', order: 4 },
    { providerId: 'kano', name: 'Kano Electric', vtpassServiceId: 'kano-electric', order: 5 },
    { providerId: 'portharcourt', name: 'Port Harcourt Electric', vtpassServiceId: 'portharcourt-electric', order: 6 },
    { providerId: 'jos', name: 'Jos Electric', vtpassServiceId: 'jos-electric', order: 7 },
    { providerId: 'ibadan', name: 'Ibadan Electric', vtpassServiceId: 'ibadan-electric', order: 8 },
  ]);
};

module.exports = mongoose.model('ElectricityPlan', electricityPlanSchema);
