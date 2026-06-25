let activeCount = 0;
let slowTimer = null;
let currentMessage = '';
let listeners = new Set();

const notify = (state) => listeners.forEach((fn) => fn(state));

export const subscribeLoading = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const showGlobalLoader = (message) => {
  activeCount += 1;
  currentMessage = message;
  notify({ visible: true, message: currentMessage, slow: false });

  if (!slowTimer) {
    slowTimer = setTimeout(() => {
      if (activeCount > 0) notify({ visible: true, message: currentMessage, slow: true });
    }, 3000);
  }
};

export const hideGlobalLoader = () => {
  activeCount = Math.max(0, activeCount - 1);
  if (activeCount === 0) {
    if (slowTimer) {
      clearTimeout(slowTimer);
      slowTimer = null;
    }
    currentMessage = '';
    notify({ visible: false, message: '', slow: false });
  }
};
