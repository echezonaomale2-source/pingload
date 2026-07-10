let appLockedListener = null;
let sessionExpiredListener = null;

export const onAppLocked = (callback) => {
  appLockedListener = callback;
  return () => {
    if (appLockedListener === callback) appLockedListener = null;
  };
};

export const emitAppLocked = () => {
  appLockedListener?.();
};

export const onSessionExpired = (callback) => {
  sessionExpiredListener = callback;
  return () => {
    if (sessionExpiredListener === callback) sessionExpiredListener = null;
  };
};

export const emitSessionExpired = () => {
  sessionExpiredListener?.();
};
