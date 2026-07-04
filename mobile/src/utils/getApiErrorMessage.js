export const getApiErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (!error?.response) {
    return 'Cannot reach the server. Check your internet connection and try again.';
  }
  const data = error.response?.data;
  if (Array.isArray(data?.errors) && data.errors.length) {
    return data.errors.map((e) => e.message).join('. ');
  }
  return data?.message || fallback;
};
