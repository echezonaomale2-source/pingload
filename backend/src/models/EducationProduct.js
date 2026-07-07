const mongoose = require('mongoose');

const educationProductSchema = new mongoose.Schema(
  {
    examType: {
      type: String,
      enum: ['waec', 'neco', 'jamb'],
      required: true,
      index: true,
    },
    productCode: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    providerServiceId: { type: String, required: true, trim: true },
    vtpassServiceId: { type: String, trim: true, select: false },
    variationCode: { type: String, default: '', trim: true },
    amount: { type: Number, required: true, min: 0 },
    requiresBillersCode: { type: Boolean, default: false },
    billersCodeLabel: { type: String, default: 'Profile Code' },
    maxQuantity: { type: Number, default: 1, min: 1, max: 10 },
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

educationProductSchema.index({ productCode: 1, vtuProvider: 1 }, { unique: true });

educationProductSchema.statics.getDefaults = () => [
  {
    examType: 'waec',
    productCode: 'waec-result-checker',
    name: 'WAEC Result Checker PIN',
    description: 'WASSCE/GCE result checker PIN',
    providerServiceId: 'waec',
    variationCode: 'waecdirect',
    amount: 900,
    requiresBillersCode: false,
    maxQuantity: 5,
    order: 1,
  },
  {
    examType: 'neco',
    productCode: 'neco-result-checker',
    name: 'NECO Result Checker PIN',
    description: 'NECO result checker PIN',
    providerServiceId: 'neco',
    variationCode: '',
    amount: 1200,
    requiresBillersCode: false,
    maxQuantity: 5,
    enabled: false,
    order: 2,
  },
  {
    examType: 'jamb',
    productCode: 'jamb-epin-mock',
    name: 'JAMB ePIN (with mock)',
    description: 'UTME PIN including mock examination',
    providerServiceId: 'jamb',
    variationCode: 'utme-mock',
    amount: 7700,
    requiresBillersCode: true,
    billersCodeLabel: 'JAMB Profile Code',
    maxQuantity: 1,
    order: 3,
  },
  {
    examType: 'jamb',
    productCode: 'jamb-epin',
    name: 'JAMB ePIN (without mock)',
    description: 'UTME PIN without mock examination',
    providerServiceId: 'jamb',
    variationCode: 'utme-no-mock',
    amount: 6200,
    requiresBillersCode: true,
    billersCodeLabel: 'JAMB Profile Code',
    maxQuantity: 1,
    order: 4,
  },
];

educationProductSchema.statics.ensureDefaults = async function () {
  const defaults = this.getDefaults();
  for (const item of defaults) {
    await this.findOneAndUpdate({ productCode: item.productCode }, { $setOnInsert: item }, { upsert: true });
  }
};

module.exports = mongoose.model('EducationProduct', educationProductSchema);
