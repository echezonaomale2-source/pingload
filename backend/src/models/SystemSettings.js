const mongoose = require('mongoose');
const { defaultServiceRouting } = require('../utils/vtuConstants');
const { migrateVtuSettings } = require('../utils/migrateVtuSettings');

const serviceToggleSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    enabled: { type: Boolean, default: true },
    description: String,
  },
  { _id: false }
);

const providerEnabledSchema = new mongoose.Schema(
  {
    vtpass: { type: Boolean, default: true },
  },
  { _id: false }
);

const dataProviderEnabledSchema = new mongoose.Schema(
  {
    vtpass: { type: Boolean, default: true },
  },
  { _id: false }
);

const serviceRoutingSchema = new mongoose.Schema(
  {
    airtime: { type: String, enum: ['vtpass'], default: 'vtpass' },
    data: { type: String, enum: ['vtpass'], default: 'vtpass' },
    electricity: { type: String, enum: ['vtpass'], default: 'vtpass' },
    tv: { type: String, enum: ['vtpass'], default: 'vtpass' },
    betting: { type: String, enum: ['vtpass'], default: 'vtpass' },
    education: { type: String, enum: ['vtpass'], default: 'vtpass' },
  },
  { _id: false }
);

const systemSettingsSchema = new mongoose.Schema(
  {
    key: { type: String, default: 'global', unique: true },
    maintenanceMode: { type: Boolean, default: false },
    otpRequired: { type: Boolean, default: true },
    minWalletFund: { type: Number, default: 100 },
    maxWalletFund: { type: Number, default: 500000 },
    referralBonus: { type: Number, default: 100 },
    supportEmail: { type: String, default: 'support@pingload.top' },
    /** @deprecated Use serviceRouting — kept for backward compatibility */
    vtuProvider: {
      type: String,
      enum: ['vtpass'],
      default: 'vtpass',
    },
    providerEnabled: {
      type: providerEnabledSchema,
      default: () => ({ vtpass: true }),
    },
    dataProviderEnabled: {
      type: dataProviderEnabledSchema,
      default: () => ({ vtpass: true }),
    },
    serviceRouting: {
      type: serviceRoutingSchema,
      default: () => defaultServiceRouting('vtpass'),
    },
    enableProviderFailover: { type: Boolean, default: false },
    catalogVersion: { type: Number, default: 1 },
    services: {
      type: [serviceToggleSchema],
      default: [
        { id: 'airtime', name: 'Airtime', enabled: true, description: 'MTN, Airtel, Glo, 9mobile airtime top-up' },
        { id: 'data', name: 'Data Subscription', enabled: true, description: 'Data bundles for all networks' },
        { id: 'electricity', name: 'Electricity', enabled: true, description: 'Electricity bill payments' },
        { id: 'tv', name: 'TV Subscription', enabled: true, description: 'DStv, GOtv, StarTimes' },
        { id: 'betting', name: 'Betting', enabled: true, description: 'Bet9ja, SportyBet, BetKing, 1xBet' },
        { id: 'education', name: 'Education Pins', enabled: true, description: 'WAEC, NECO, JAMB pins' },
      ],
    },
  },
  { timestamps: true }
);

systemSettingsSchema.statics.getSettings = async function () {
  let settings = await this.findOne({ key: 'global' });
  if (!settings) {
    settings = await this.create({ key: 'global' });
  }
  await migrateVtuSettings(settings);
  return settings;
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
