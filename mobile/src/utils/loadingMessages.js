/** Context-specific loading messages for Pingload API routes */
export const LOADING_MESSAGES = {
  DEFAULT: 'Please Wait...',
  SLOW: "Please wait, we're processing your request.",
  LOGIN: 'Signing In...',
  REGISTER: 'Creating Account...',
  OTP: 'Verifying Code...',
  RESET_PASSWORD: 'Resetting Password...',
  FUND_WALLET: 'Processing Payment...',
  VERIFY_PAYMENT: 'Verifying Transaction...',
  AIRTIME: 'Purchasing Airtime...',
  DATA: 'Purchasing Data...',
  ELECTRICITY: 'Processing Payment...',
  TV: 'Processing Payment...',
  EDUCATION: 'Processing Purchase...',
  BETTING: 'Processing Payment...',
  TRANSFER: 'Processing Transfer...',
  PROFILE: 'Updating Profile...',
  AVATAR: 'Uploading Photo...',
  KYC: 'Submitting Documents...',
  PIN: 'Verifying Transaction...',
  PASSWORD: 'Updating Password...',
  DASHBOARD: 'Loading Dashboard...',
};

export const getLoadingMessage = (url = '', method = 'get') => {
  const path = url.toLowerCase();
  const m = method.toLowerCase();

  if (path.includes('/auth/login')) return LOADING_MESSAGES.LOGIN;
  if (path.includes('/auth/register')) return LOADING_MESSAGES.REGISTER;
  if (path.includes('/auth/verify-otp') || path.includes('/auth/send-otp')) return LOADING_MESSAGES.OTP;
  if (path.includes('/auth/reset-password') || path.includes('/auth/forgot-password')) return LOADING_MESSAGES.RESET_PASSWORD;
  if (path.includes('/auth/avatar')) return LOADING_MESSAGES.AVATAR;
  if (path.includes('/auth/profile') || path.includes('/auth/settings')) return LOADING_MESSAGES.PROFILE;
  if (path.includes('/auth/change-password')) return LOADING_MESSAGES.PASSWORD;
  if (path.includes('/wallet/fund')) return LOADING_MESSAGES.FUND_WALLET;
  if (path.includes('/wallet/verify')) return LOADING_MESSAGES.VERIFY_PAYMENT;
  if (path.includes('/wallet/transfer')) return LOADING_MESSAGES.TRANSFER;
  if (path.includes('/vtu/airtime')) return LOADING_MESSAGES.AIRTIME;
  if (path.includes('/vtu/data') && m === 'post') return LOADING_MESSAGES.DATA;
  if (path.includes('/vtu/electricity') && m === 'post') return LOADING_MESSAGES.ELECTRICITY;
  if (path.includes('/vtu/tv')) return LOADING_MESSAGES.TV;
  if (path.includes('/vtu/education')) return LOADING_MESSAGES.EDUCATION;
  if (path.includes('/vtu/betting')) return LOADING_MESSAGES.BETTING;
  if (path.includes('/kyc/submit')) return LOADING_MESSAGES.KYC;
  if (path.includes('/pin/')) return LOADING_MESSAGES.PIN;
  if (path.includes('/dashboard')) return LOADING_MESSAGES.DASHBOARD;

  if (m === 'post' || m === 'put' || m === 'patch' || m === 'delete') {
    return LOADING_MESSAGES.DEFAULT;
  }

  return LOADING_MESSAGES.DASHBOARD;
};
