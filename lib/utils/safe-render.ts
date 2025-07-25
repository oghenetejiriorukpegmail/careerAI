/**
 * Global utility for safely rendering any data that might be objects with Zone keys
 * This prevents the "Objects are not valid as a React child" error
 */

export function safeRender(value: any): string {
  // Handle null/undefined
  if (value == null) return '';
  
  // Handle strings (most common case)
  if (typeof value === 'string') return value;
  
  // Handle objects (including Zone objects)
  if (typeof value === 'object') {
    // Check if it's an array
    if (Array.isArray(value)) {
      return value.map(item => safeRender(item)).join(', ');
    }
    
    // Handle regular objects (including Zone objects like {Zone A: "value", Zone B: "value"})
    const values = Object.values(value).filter(Boolean);
    if (values.length > 0) {
      return values.map(v => safeRender(v)).join(', ');
    }
    
    // Fallback for empty objects
    return '';
  }
  
  // Handle all other types (numbers, booleans, etc.)
  return String(value);
}

/**
 * Specialized function for rendering address data
 */
export function safeRenderAddress(address: any): string {
  return safeRender(address);
}

/**
 * Function to safely render arrays of potentially complex data
 */
export function safeRenderArray(arr: any[]): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map(item => safeRender(item));
}

/**
 * Debug function to log when Zone objects are encountered
 */
export function logZoneObjects(value: any, context: string = ''): any {
  if (typeof value === 'object' && value !== null) {
    const keys = Object.keys(value);
    if (keys.some(key => key.includes('Zone'))) {
      console.warn(`🚨 Zone object detected in ${context}:`, value);
      console.trace('Zone object stack trace');
    }
  }
  return value;
}

/**
 * React Hook for safe rendering with automatic Zone object detection
 */
export function useSafeRender() {
  return {
    safeRender,
    safeRenderAddress,
    safeRenderArray,
    logZoneObjects
  };
}