/**
 * Cache clearing utility for AI configuration and settings
 * 
 * This module provides utilities to force clear cached settings
 * and ensure AI configuration is consistently updated across all modules.
 */

import { UserSettings } from '../utils/settings';
import { AI_CONFIG } from './config';
import { updateServerSettings } from './settings-loader';

// Flag to track whether initial settings have been applied
let initialSettingsApplied = false;

/**
 * Force reset of all AI configuration and settings caches
 * This should be called when settings are updated to ensure
 * all components have the latest settings.
 */
export async function clearAllCaches(): Promise<void> {
  console.log('Clearing all AI and document processing caches...');
  
  try {
    // Reset settings timestamp via global state to avoid circular dependencies
    if (typeof global !== 'undefined') {
      if (global._aiConfigState) {
        global._aiConfigState.lastSettingsRefresh = 0;
      } else {
        global._aiConfigState = { lastSettingsRefresh: 0 };
      }
    }
    
    // Document parser caches are no longer available
    console.log('Document parser cache clearing skipped (dependencies not available)');
    
    // Force garbage collection if available
    if (typeof global !== 'undefined' && typeof (global as any).gc === 'function') {
      try {
        // @ts-ignore - gc() is available when Node is run with --expose-gc flag
        (global as any).gc();
        console.log('Garbage collection triggered');
      } catch (gcError) {
        // Ignore GC errors
      }
    }
    
    console.log('Cache clearing complete.');
  } catch (error) {
    console.error('Error clearing caches:', error);
  }
}

/**
 * Force update of AI configuration with the provided settings
 * Directly updates all relevant fields in the AI_CONFIG object
 */
export function updateConfigDirectly(settings: UserSettings): void {
  console.log('Directly updating AI_CONFIG with settings:', JSON.stringify({
    provider: settings.aiProvider,
    model: settings.aiModel,
    updatedAt: settings.updatedAt
  }));
  
  // Update each provider's model setting based on the current provider
  try {
    // Update the specific provider that's active
    switch (settings.aiProvider) {
      case 'openrouter':
        AI_CONFIG.openrouter.model = settings.aiModel;
        console.log(`Updated OpenRouter model to ${settings.aiModel}`);
        break;
      case 'anthropic':
        // AI_CONFIG.anthropic.model = settings.aiModel;
        console.log(`Anthropic provider not configured yet`);
        break;
      case 'requesty':
        AI_CONFIG.requesty.model = settings.aiModel;
        console.log(`Updated Requesty model to ${settings.aiModel}`);
        break;
      case 'openai':
        AI_CONFIG.openai.model = settings.aiModel;
        console.log(`Updated OpenAI model to ${settings.aiModel}`);
        break;
      case 'google':
        AI_CONFIG.gemini.model = settings.aiModel;
        console.log(`Updated Google model to ${settings.aiModel}`);
        break;
      case 'vertex':
        AI_CONFIG.vertex.model = settings.aiModel;
        console.log(`Updated Vertex model to ${settings.aiModel}`);
        break;
      default:
        console.warn(`Unknown AI provider: ${settings.aiProvider}`);
    }
    
    // Set the initialSettingsApplied flag
    initialSettingsApplied = true;
  } catch (error) {
    console.error('Error updating AI_CONFIG directly:', error);
  }
}

/**
 * Force update of settings across all modules
 * @param settings User settings to apply
 * @returns Success status
 */
export async function forceSettingsUpdate(settings: UserSettings): Promise<boolean> {
  try {
    console.log('Forcing settings update across all modules...');
    
    // Update the AI config directly
    updateConfigDirectly(settings);
    
    // Set global settings 
    if (typeof global !== 'undefined') {
      global.userSettings = { ...settings };
      console.log('Updated global.userSettings');
    }
    
    // Reset settings timestamp
    if (typeof global !== 'undefined') {
      if (global._aiConfigState) {
        global._aiConfigState.lastSettingsRefresh = 0;
      } else {
        global._aiConfigState = { lastSettingsRefresh: 0 };
      }
    }
    
    // Update server-side settings cache, but don't use await to avoid circular calls
    try {
      updateServerSettings(settings);
    } catch (settingsError) {
      console.warn('Error updating server settings cache, continuing:', settingsError);
    }
    
    // Clear caches asynchronously
    clearAllCaches().catch(cacheError => {
      console.warn('Error clearing caches, continuing:', cacheError);
    });
    
    console.log('Settings force update completed successfully');
    
    return true;
  } catch (error) {
    console.error('Failed to force settings update:', error);
    return false;
  }
}

/**
 * Check if initial settings have been applied
 * Used to determine if we need to force settings update on first use
 */
export function areInitialSettingsApplied(): boolean {
  return initialSettingsApplied;
}

/**
 * Set the initial settings applied flag
 * Used for testing and forcing reinitialization
 */
export function setInitialSettingsApplied(value: boolean): void {
  initialSettingsApplied = value;
}