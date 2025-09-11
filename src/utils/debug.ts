export const isDebugEnabled = (): boolean => {
  try {
    if (typeof window !== 'undefined') {
      const v = window.localStorage?.getItem('DEBUG_LOGS') || window.localStorage?.getItem('debugLogs');
      return v === '1' || v === 'true';
    }
    return process.env.NEXT_PUBLIC_DEBUG_LOGS === 'true';
  } catch {
    return false;
  }
};

export const debugLog = (...args: any[]) => {
  if (isDebugEnabled()) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};

export const debugWarn = (...args: any[]) => {
  if (isDebugEnabled()) {
    // eslint-disable-next-line no-console
    console.warn(...args);
  }
};


