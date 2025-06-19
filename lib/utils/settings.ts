// Utility functions for settings management

// Define settings type
export interface UserSettings {
  aiProvider: string;
  aiModel: string;
  documentAiOnly: boolean;
  enableLogging: boolean;
  showAiAttribution?: boolean;
  tokenLimits?: {
    resumeParsing?: number;
    coverLetter?: number;
    jobMatching?: number;
    general?: number;
  };
  updatedAt?: number; // Timestamp for synchronization
}

// Extend NodeJS.Global to include userSettings
declare global {
  var userSettings: UserSettings | undefined;
  var _aiConfigState: {
    lastSettingsRefresh: number;
    settingsRefreshCount?: number;
    lastResetTimestamp?: number;
  } | undefined;
}

// Default settings - using Qwen 3 235B via OpenRouter as specified in PRD
export const defaultSettings: UserSettings = {
  aiProvider: 'openrouter',
  aiModel: 'qwen/qwen3-235b-a22b:free',  // Free tier Qwen model via OpenRouter
  documentAiOnly: true,
  enableLogging: true,
  showAiAttribution: false,
  tokenLimits: {
    resumeParsing: 0, // 0 means use automatic
    coverLetter: 0,
    jobMatching: 0,
    general: 0
  },
  updatedAt: Date.now() // Current timestamp
};

// Save settings to localStorage
export function saveSettingsToLocalStorage(settings: UserSettings): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('userSettings', JSON.stringify(settings));
    console.log('Settings saved to localStorage');
  } catch (error) {
    console.warn('Failed to save settings to localStorage:', error);
  }
}

// Load settings from localStorage
export function loadSettingsFromLocalStorage(): UserSettings | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const settingsString = localStorage.getItem('userSettings');
    if (!settingsString) return null;
    
    const settings = JSON.parse(settingsString);
    console.log('Settings loaded from localStorage');
    return settings;
  } catch (error) {
    console.warn('Failed to load settings from localStorage:', error);
    return null;
  }
}

// Apply settings to update the AI configuration and save them to backend
export async function applySettings(settings: UserSettings): Promise<boolean> {
  try {
    // Add a timestamp for synchronization
    settings.updatedAt = Date.now();
    
    // Check if we're running in a Node.js environment (server-side)
    const isServerSide = typeof window === 'undefined';
    
    // Always save to localStorage if we're on the client side
    if (!isServerSide) {
      saveSettingsToLocalStorage(settings);
    }
    
    // Track success for different operations
    let applySuccess = false;
    let saveSuccess = false;
    
    // Apply settings via API endpoint
    try {
      // Use absolute URL for server-side requests
      const baseUrl = isServerSide
        ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
        : '';
      
      // Send settings to API endpoint to apply them
      const response = await fetch(`${baseUrl}/api/settings/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
        // Include credentials for authenticated requests
        credentials: 'include'
      });
      
      // If the server apply succeeds, also update the global settings cache
      if (response.ok) {
        applySuccess = true;
        
        // For server-side, update the global settings cache
        if (isServerSide && typeof global !== 'undefined') {
          global.userSettings = { ...settings };
        }
        
        // Check the response for detailed information
        try {
          const result = await response.json();
          console.log('Settings apply response:', result);
          
          // If the server indicates changes were made, log that information
          if (result.appliedSettings) {
            console.log(`Applied settings: Provider=${result.appliedSettings.provider}, Model=${result.appliedSettings.model}`);
          }
        } catch (jsonError) {
          console.warn('Error parsing settings apply response:', jsonError);
        }
      }
    } catch (applyError) {
      console.warn('Error applying settings via API:', applyError);
    }
    
    // Save to the API endpoint (requires auth)
    try {
      // Use absolute URL for server-side requests
      const baseUrl = isServerSide
        ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
        : '';
      
      // Try to save settings to the auth-protected endpoint
      const saveResponse = await fetch(`${baseUrl}/api/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
        credentials: 'include'
      });
      
      if (saveResponse.ok) {
        saveSuccess = true;
        console.log('Settings saved to authenticated endpoint');
      } else if (saveResponse.status === 401) {
        // Not authenticated, user needs to login
        console.log('Not authenticated for settings save');
      }
    } catch (saveError) {
      console.warn('Error saving settings to API:', saveError);
    }
    
    // Authentication is required for server-side settings storage
    
    // Return true if either operation succeeded
    return applySuccess || saveSuccess || !isServerSide;
  } catch (error) {
    console.error('Failed to apply settings:', error);
    // Still return true if we're client-side and saved to localStorage
    return !(typeof window === 'undefined');
  }
}

// Load settings from API
export async function loadSettingsFromAPI(): Promise<UserSettings | null> {
  try {
    // Check if we're running in a Node.js environment (server-side)
    const isServerSide = typeof window === 'undefined';
    
    // If we're running on the server and there's no API key/auth configured,
    // don't attempt to fetch settings to avoid unnecessary 401 errors
    if (isServerSide && !process.env.NEXT_PUBLIC_ENABLE_SERVER_API_FETCH) {
      console.log('Server-side API fetch disabled, using defaults');
      return null;
    }
    
    // First try the regular authenticated API endpoint
    try {
      // Use absolute URL for server-side requests
      const baseUrl = isServerSide
        ? process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
        : '';
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      console.log(`Fetching settings from ${baseUrl}/api/settings`);
      const response = await fetch(`${baseUrl}/api/settings`, {
        signal: controller.signal,
        // Include credentials for authenticated requests
        credentials: 'include'
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const settings = await response.json();
        console.log('Settings loaded from API');
        return settings;
      } else if (response.status === 401) {
        // User is not authenticated, return null
        console.log('User not authenticated, settings not available');
        return null;
      } else {
        console.warn(`API returned status ${response.status}, unable to load settings`);
      }
    } catch (apiError) {
      console.warn('API request failed:', apiError);
    }
    
    // Authentication required for settings
    console.log('Authentication required for settings');
    
    // If we get here, we couldn't load settings from anywhere
    return null;
  } catch (error) {
    console.warn('Failed to load settings:', error);
    return null;
  }
}

// Get settings (from localStorage, API, or defaults)
export async function getSettings(): Promise<UserSettings> {
  try {
    // Check if we're running in a server environment
    const isServerSide = typeof window === 'undefined';
    
    if (isServerSide) {
      // For server-side, try to use cached settings in global if available
      if (typeof global !== 'undefined' && global.userSettings) {
        return { ...global.userSettings };
      }
      
      // For server-side, try API first (with a short timeout)
      const apiSettings = await loadSettingsFromAPI();
      if (apiSettings) {
        // Cache settings in global for future server-side requests
        if (typeof global !== 'undefined') {
          global.userSettings = { ...apiSettings };
        }
        return { ...apiSettings };
      }
      
      // Fall back to defaults for server-side
      const defaultSettingsCopy = { ...defaultSettings };
      // Cache default settings in global for future server-side requests
      if (typeof global !== 'undefined') {
        global.userSettings = { ...defaultSettingsCopy };
      }
      return defaultSettingsCopy;
    } else {
      // Client-side handling
      
      // For client-side, try localStorage first as it represents the user's most
      // recent choices even if they're not logged in
      const localSettings = loadSettingsFromLocalStorage();
      if (localSettings) {
        console.log('Using settings from localStorage');
        
        // Background synchronization logic:
        // Try to sync with API if possible (but don't wait for it)
        loadSettingsFromAPI().then(apiSettings => {
          // Check if we got settings from the API
          if (apiSettings) {
            // If remote settings exist, compare timestamps if available
            const localUpdatedAt = localSettings.updatedAt || 0;
            const remoteUpdatedAt = apiSettings.updatedAt || 0;
            
            // If remote is newer, update localStorage
            if (remoteUpdatedAt > localUpdatedAt) {
              console.log('Syncing localStorage with newer remote settings');
              saveSettingsToLocalStorage(apiSettings);
            } else {
              // If local is newer or same, push local to remote
              console.log('Local settings are current, syncing to remote');
              applySettings(localSettings).catch(() => {});
            }
          } else {
            // If no remote settings, push local settings to remote
            console.log('No remote settings found, pushing local settings');
            applySettings(localSettings).catch(() => {});
          }
        }).catch(() => {});
        
        return { ...localSettings };
      }
      
      // If no localStorage settings, try authenticated API
      try {
        const apiSettings = await loadSettingsFromAPI();
        if (apiSettings) {
          console.log('Using settings from API');
          // Save to localStorage for future use
          saveSettingsToLocalStorage(apiSettings);
          return { ...apiSettings };
        }
      } catch (apiError) {
        console.warn('Failed to load API settings:', apiError);
      }
      
      // Authentication required for server-side settings
      console.log('Authentication required for server-side settings');
      
      // If no settings found anywhere, use defaults and save to localStorage
      console.log('No saved settings found, using defaults');
      const defaultSettingsCopy = { ...defaultSettings };
      
      // Add timestamp for future synchronization
      defaultSettingsCopy.updatedAt = Date.now();
      
      // Save to localStorage
      saveSettingsToLocalStorage(defaultSettingsCopy);
      
      // User needs to be logged in to save settings to server
      
      return { ...defaultSettingsCopy };
    }
  } catch (error) {
    console.error('Error getting settings, using defaults:', error);
    const defaultSettingsCopy = { ...defaultSettings };
    
    // Add timestamp for future synchronization
    defaultSettingsCopy.updatedAt = Date.now();
    
    // For client-side, save defaults to localStorage for consistency
    if (typeof window !== 'undefined') {
      saveSettingsToLocalStorage(defaultSettingsCopy);
      
      // User needs to be logged in to save settings to server
    }
    
    return defaultSettingsCopy;
  }
}