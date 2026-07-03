import NetInfo from '@react-native-community/netinfo';

const NETINFO_TIMEOUT_MS = 3000;

let cachedConnected = true;

/** isInternetReachable is unreliable on Android (often false/null while connected). */
const isNetworkConnected = (state) => Boolean(state?.isConnected);

NetInfo.addEventListener((state) => {
  cachedConnected = isNetworkConnected(state);
});

const withTimeout = (promise, ms, fallback) =>
  Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);

export const isOnline = async () => {
  try {
    const state = await withTimeout(NetInfo.fetch(), NETINFO_TIMEOUT_MS, null);
    if (!state) return cachedConnected;
    cachedConnected = isNetworkConnected(state);
    return cachedConnected;
  } catch {
    return cachedConnected;
  }
};

export const getCachedOnlineStatus = () => cachedConnected;
