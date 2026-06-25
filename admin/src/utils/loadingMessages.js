export const LOADING_MESSAGES = {
  DEFAULT: 'Please Wait...',
  SLOW: "Please wait, we're processing your request.",
  LOGIN: 'Signing In...',
  DASHBOARD: 'Loading Dashboard...',
  USERS: 'Loading users...',
  KYC: 'Processing KYC review...',
  SAVE: 'Saving changes...',
  DELETE: 'Deleting...',
  SEND: 'Sending...',
};

export const getLoadingMessage = (url = '', method = 'get') => {
  const path = url.toLowerCase();
  const m = method.toLowerCase();

  if (path.includes('/admin/auth/login')) return LOADING_MESSAGES.LOGIN;
  if (path.includes('/kyc') && m !== 'get') return LOADING_MESSAGES.KYC;
  if (path.includes('/notifications') && m === 'post') return LOADING_MESSAGES.SEND;
  if (m === 'delete') return LOADING_MESSAGES.DELETE;
  if (['post', 'put', 'patch'].includes(m)) return LOADING_MESSAGES.SAVE;
  if (path.includes('/users') || path.includes('/dashboard')) return LOADING_MESSAGES.DASHBOARD;

  return LOADING_MESSAGES.DEFAULT;
};
