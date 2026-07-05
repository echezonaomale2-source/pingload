let listener = null;

export const onAppLocked = (callback) => {
  listener = callback;
  return () => {
    if (listener === callback) listener = null;
  };
};

export const emitAppLocked = () => {
  listener?.();
};
