const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const checks = [];

const assertContains = (relativePath, needle, description) => {
  checks.push(() => {
    const content = read(relativePath);
    if (!content.includes(needle)) {
      throw new Error(`${description} missing in ${relativePath}`);
    }
  });
};

const assertNotContains = (relativePath, needle, description) => {
  checks.push(() => {
    const content = read(relativePath);
    if (content.includes(needle)) {
      throw new Error(`${description} still present in ${relativePath}`);
    }
  });
};

assertContains(
  'src/services/walletTransactionService.js',
  'createTransferWithAtomicWallet',
  'Atomic wallet transfer helper'
);
assertContains(
  'src/services/walletTransactionService.js',
  'balance: { $gte: amount }',
  'Atomic sufficient-balance debit guard'
);
assertContains(
  'src/services/walletTransactionService.js',
  'MongoDB transactions are required for production wallet operations',
  'Production transaction requirement'
);
assertContains(
  'src/controllers/walletController.js',
  'createTransferWithAtomicWallet',
  'Wallet transfer controller using atomic helper'
);
assertContains(
  'src/routes/walletRoutes.js',
  "idempotency('wallet:transfer')",
  'Wallet transfer idempotency'
);
assertContains(
  'src/routes/walletRoutes.js',
  "idempotency('wallet:fund')",
  'Wallet funding initialization idempotency'
);
assertContains(
  'src/services/walletFundingService.js',
  'Transaction.findOneAndUpdate',
  'Atomic funding status transition'
);
assertContains(
  'src/services/walletFundingService.js',
  'assertFundingAmountWithinLimits',
  'Funding amount limit enforcement'
);
assertContains(
  'src/services/walletFundingService.js',
  'atomicWalletCredit',
  'Atomic wallet funding credit'
);
assertNotContains(
  'src/services/walletFundingService.js',
  'amount: amountInNaira',
  'Funding transaction amount overwrite'
);
assertContains(
  'src/services/paystackService.js',
  'crypto.timingSafeEqual',
  'Timing-safe Paystack signature comparison'
);
assertContains(
  'server.js',
  "app.set('trust proxy', 1)",
  'Render proxy trust for rate limits'
);
assertContains(
  'src/routes/adminRoutes.js',
  'adminAuthLimiter',
  'Admin auth rate limiting'
);
assertContains(
  'src/middleware/adminAuth.js',
  "decoded.tokenType !== 'admin'",
  'Admin token type enforcement'
);
assertContains(
  'src/middleware/auth.js',
  "decoded.tokenType !== 'user'",
  'User token type enforcement'
);
assertContains(
  'src/services/termiiService.js',
  "process.env.NODE_ENV === 'production'",
  'Production OTP fail-closed path'
);
assertNotContains(
  path.join('..', 'admin', 'src', 'pages', 'Login.jsx'),
  'Demo: admin@pingload.com / admin123',
  'Admin demo credentials'
);
assertContains(
  'src/utils/safeQuery.js',
  'escapeRegex',
  'Safe regex escaping helper'
);

const failures = [];

for (const check of checks) {
  try {
    check();
  } catch (error) {
    failures.push(error.message);
  }
}

if (failures.length) {
  console.error('Security remediation checks failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Security remediation checks passed (${checks.length}/${checks.length})`);
