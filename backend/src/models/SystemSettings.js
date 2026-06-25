const mongoose = require('mongoose');

const serviceToggleSchema = new mongoose.Schema(
  {
    id: String,
    name: String,
    enabled: { type: Boolean, default: true },
    description: String,
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
  return settings;
};

module.exports = mongoose.model('SystemSettings', systemSettingsSchema);
