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
      enum: ['clubkonnect', 'vtpass'],
      default: 'clubkonnect',
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
    { providerId: 'ikeja', name: 'Ikeja Electric', providerServiceId: '02', order: 1 },
    { providerId: 'eko', name: 'Eko Electric', providerServiceId: '01', order: 2 },
    { providerId: 'abuja', name: 'Abuja Electric', providerServiceId: '03', order: 3 },
    { providerId: 'kaduna', name: 'Kaduna Electric', providerServiceId: '08', order: 4 },
    { providerId: 'kano', name: 'Kano Electric', providerServiceId: '04', order: 5 },
    { providerId: 'portharcourt', name: 'Port Harcourt Electric', providerServiceId: '05', order: 6 },
    { providerId: 'jos', name: 'Jos Electric', providerServiceId: '06', order: 7 },
    { providerId: 'ibadan', name: 'Ibadan Electric', providerServiceId: '07', order: 8 },
  ]);
};

module.exports = mongoose.model('ElectricityPlan', electricityPlanSchema);
