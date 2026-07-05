const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    phoneNumber: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password is required'],
      select: false,
    },
    walletBalance: {
      type: Number,
      default: 0,
      min: 0,
    },
    referralCode: {
      type: String,
      unique: true,
      sparse: true,
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    kycStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },
    transactionPin: {
      type: String,
      select: false,
    },
    hasTransactionPin: {
      type: Boolean,
      default: false,
    },
    loginPin: {
      type: String,
      select: false,
    },
    hasLoginPin: {
      type: Boolean,
      default: false,
    },
    appUnlockedUntil: {
      type: Date,
      default: null,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    darkMode: {
      type: Boolean,
      default: false,
    },
    useSystemTheme: {
      type: Boolean,
      default: true,
    },
    biometricEnabled: {
      type: Boolean,
      default: false,
    },
    notificationSettings: {
      transactions: { type: Boolean, default: true },
      promotions: { type: Boolean, default: true },
      security: { type: Boolean, default: true },
    },
    avatar: {
      type: String,
      default: null,
    },
    accountStatus: {
      type: String,
      enum: ['active', 'suspended'],
      default: 'active',
    },
    loginPinFailedAttempts: { type: Number, default: 0, min: 0 },
    loginPinLockedUntil: { type: Date, default: null },
    requireLoginPinReset: { type: Boolean, default: false },
    transactionPinFailedAttempts: { type: Number, default: 0, min: 0 },
    transactionPinLockedUntil: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (this.isModified('passwordHash')) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  }
  if (this.isModified('transactionPin') && this.transactionPin) {
    this.transactionPin = await bcrypt.hash(this.transactionPin, 12);
    this.hasTransactionPin = true;
  }
  if (this.isModified('loginPin') && this.loginPin) {
    this.loginPin = await bcrypt.hash(this.loginPin, 12);
    this.hasLoginPin = true;
  }
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

userSchema.methods.comparePin = async function (candidatePin) {
  if (!this.transactionPin) return false;
  return bcrypt.compare(candidatePin, this.transactionPin);
};

userSchema.methods.compareLoginPin = async function (candidatePin) {
  if (!this.loginPin) return false;
  return bcrypt.compare(candidatePin, this.loginPin);
};

module.exports = mongoose.model('User', userSchema);
