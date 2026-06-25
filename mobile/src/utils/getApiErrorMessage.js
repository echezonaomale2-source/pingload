export const getApiErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (!error?.response) {
    return 'Cannot reach the server. Make sure the backend is running and your phone is on the same Wi-Fi network.';
  }
  return error.response?.data?.message || fallback;
};
