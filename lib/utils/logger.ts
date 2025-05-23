const isDevelopment = process.env.NODE_ENV === 'development';
const debugEnabled = process.env.NEXT_PUBLIC_DEBUG === 'true';

export const logger = {
  log: (...args: any[]) => {
    if (isDevelopment || debugEnabled) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    // Always log errors
    console.error(...args);
  },
  warn: (...args: any[]) => {
    if (isDevelopment || debugEnabled) {
      console.warn(...args);
    }
  },
  info: (...args: any[]) => {
    if (isDevelopment || debugEnabled) {
      console.info(...args);
    }
  },
  debug: (...args: any[]) => {
    if (debugEnabled) {
      console.debug(...args);
    }
  }
};