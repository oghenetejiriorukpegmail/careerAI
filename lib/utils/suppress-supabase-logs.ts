/**
 * Utility to suppress noisy Supabase GoTrueClient debug logs
 * This patches console methods to filter out GoTrueClient debug messages
 */

// Store original console methods
const originalConsoleLog = console.log;
const originalConsoleDebug = console.debug;

/**
 * Check if a log message is from GoTrueClient debug logging
 */
function isGoTrueClientLog(args: any[]): boolean {
  if (!args || args.length === 0) return false;
  
  const firstArg = String(args[0] || '');
  
  // Filter out GoTrueClient debug messages
  const goTruePatterns = [
    'GoTrueClient@',
    '#_acquireLock',
    '#_useSession',
    '#_autoRefreshTokenTick',
    '#__loadSession',
    '#getSession()',
    '#_handleVisibilityChange',
    '#_removeVisibilityChangedCallback',
    '#_stopAutoRefresh',
    '#onAuthStateChange()',
    '#_startAutoRefresh',
    '#_initialize()'
  ];
  
  return goTruePatterns.some(pattern => firstArg.includes(pattern));
}

/**
 * Patch console methods to suppress GoTrueClient logs
 */
function suppressGoTrueClientLogs() {
  // Only suppress in development to avoid affecting production logging
  if (process.env.NODE_ENV !== 'development') {
    return;
  }
  
  // Check if user wants to suppress these logs
  if (process.env.SUPABASE_DEBUG === 'false') {
    console.log = (...args: any[]) => {
      if (!isGoTrueClientLog(args)) {
        originalConsoleLog.apply(console, args);
      }
    };
    
    console.debug = (...args: any[]) => {
      if (!isGoTrueClientLog(args)) {
        originalConsoleDebug.apply(console, args);
      }
    };
  }
}

/**
 * Restore original console methods
 */
export function restoreConsole() {
  console.log = originalConsoleLog;
  console.debug = originalConsoleDebug;
}

// Auto-suppress on import if environment variable is set
if (typeof window === 'undefined') {
  // Server-side suppression
  suppressGoTrueClientLogs();
} else {
  // Client-side suppression
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', suppressGoTrueClientLogs);
  } else {
    suppressGoTrueClientLogs();
  }
}

export { suppressGoTrueClientLogs };