/**
 * Cache reset utilities for AI settings
 * This file provides utilities to reset caches and force settings updates
 */

import { UserSettings, defaultSettings } from '../utils/settings';
import { AI_CONFIG } from './config';

// Flag to track if we've applied settings on startup
let initialSettingsApplied = false;

// Storage for last applied settings - for debugging
let lastAppliedSettings: {
  provider?: string;
  model?: string;
  timestamp?: number;
} | null = null;

/**
 * Force reset all caches and update configurations directly
 * This should be called whenever settings change
 */
export async function forceSettingsUpdate(settings: UserSettings): Promise<boolean> {
  try {
    console.log('Forcing settings update across all modules...');
    
    // Ensure settings has the latest timestamp - always refresh timestamp
    settings.updatedAt = Date.now();
    
    // Validate settings before applying
    if (!settings.aiProvider || !settings.aiModel) {
      console.warn('Invalid settings detected, falling back to defaults');
      settings = { ...defaultSettings, updatedAt: Date.now() };
    }
    
    // Store last applied settings for debugging
    lastAppliedSettings = {
      provider: settings.aiProvider,
      model: settings.aiModel,
      timestamp: Date.now()
    };
    
    // Update the AI config directly
    updateConfigDirectly(settings);
    
    // Update global settings cache for consistent access across modules
    if (typeof global !== 'undefined') {
      // Clear any existing cached settings
      global.userSettings = undefined;
      // Then set fresh settings
      global.userSettings = { ...settings };
      console.log('Updated global settings cache during force update');
    }
    
    // Clear all module caches if possible
    try {
      // Import dynamically to avoid circular dependencies
      const clearCacheModule = await import('./clear-cache');
      if (clearCacheModule && clearCacheModule.clearAllCaches) {
        await clearCacheModule.clearAllCaches();
      }
    } catch (importError) {
      console.warn('Could not import clear-cache module:', importError);
    }
    
    console.log('Cleared settings refresh cache');
    
    // Log the configuration to verify it's correct
    console.log('Verifying AI configuration after update:');
    console.log(`Active provider: ${settings.aiProvider}`);
    console.log(`Active model: ${settings.aiModel}`);
    console.log(`OpenRouter: ${AI_CONFIG.openrouter.model}`);
    console.log(`Anthropic: ${settings.aiProvider === 'anthropic' ? settings.aiModel : 'Not configured'}`);
    console.log(`Requesty: ${AI_CONFIG.requesty.model}`);
    console.log(`OpenAI: ${AI_CONFIG.openai.model}`);
    console.log(`Gemini: ${AI_CONFIG.gemini.model}`);
    console.log(`Vertex: ${AI_CONFIG.vertex.model}`);
    
    // Force garbage collection if available
    try {
      if (global && typeof (global as any).gc === 'function') {
        (global as any).gc();
        console.log('Forced garbage collection');
      }
    } catch (gcError) {
      // Ignore GC errors
    }
    
    // Set initial settings applied flag
    initialSettingsApplied = true;
    
    console.log('Settings force updated successfully with timestamp:', settings.updatedAt);
    return true;
  } catch (error) {
    console.error('Failed to force settings update:', error);
    return false;
  }
}

/**
 * Update all provider configurations directly
 * Exported to allow direct configuration updates from other modules
 */
export function updateConfigDirectly(settings: UserSettings): void {
  // Validate settings
  if (!settings || !settings.aiProvider || !settings.aiModel) {
    console.warn('Invalid settings detected in updateConfigDirectly, using defaults');
    settings = { ...defaultSettings };
  }
  
  // Update timestamp if not present
  if (!settings.updatedAt) {
    settings.updatedAt = Date.now();
  }
  
  console.log('Directly updating AI config with settings:', JSON.stringify({
    provider: settings.aiProvider,
    model: settings.aiModel,
    logging: settings.enableLogging,
    timestamp: settings.updatedAt
  }));
  
  // First update the specific provider based on settings
  switch (settings.aiProvider) {
    case 'openrouter':
      AI_CONFIG.openrouter.model = settings.aiModel;
      break;
    case 'anthropic':
      // AI_CONFIG.anthropic.model = settings.aiModel;
      console.warn('Anthropic provider not configured yet');
      break;
    case 'requesty':
      AI_CONFIG.requesty.model = settings.aiModel;
      break;
    case 'openai':
      AI_CONFIG.openai.model = settings.aiModel;
      break;
    case 'google':
      AI_CONFIG.gemini.model = settings.aiModel;
      break;
    case 'vertex':
      AI_CONFIG.vertex.model = settings.aiModel;
      break;
    default:
      console.warn(`Unknown provider ${settings.aiProvider}, using default`);
      // Set a safe default
      AI_CONFIG.openrouter.model = 'anthropic/claude-sonnet-4';
      settings.aiProvider = 'openrouter';
      settings.aiModel = 'anthropic/claude-sonnet-4';
  }
  
  // Then update all provider configurations to ensure consistency
  // This gives double protection - both the specific update above AND the general updates below
  AI_CONFIG.openrouter.model = settings.aiProvider === 'openrouter' ? settings.aiModel : AI_CONFIG.openrouter.model;
  // Note: AI_CONFIG.anthropic doesn't exist - anthropic is handled by queryAI function directly
  AI_CONFIG.requesty.model = settings.aiProvider === 'requesty' ? settings.aiModel : AI_CONFIG.requesty.model;
  AI_CONFIG.openai.model = settings.aiProvider === 'openai' ? settings.aiModel : AI_CONFIG.openai.model;
  AI_CONFIG.gemini.model = settings.aiProvider === 'google' ? settings.aiModel : AI_CONFIG.gemini.model;
  AI_CONFIG.vertex.model = settings.aiProvider === 'vertex' ? settings.aiModel : AI_CONFIG.vertex.model;
  
  // Update global settings for other modules to use
  if (typeof global !== 'undefined') {
    global.userSettings = { ...settings };
  }
  
  // Store the last applied settings for debugging purposes
  lastAppliedSettings = {
    provider: settings.aiProvider,
    model: settings.aiModel,
    timestamp: Date.now()
  };
  
  console.log('AI config updated. Current provider configurations:');
  console.log(`Active provider: ${settings.aiProvider}`);
  console.log(`Active model: ${settings.aiModel}`);
  console.log('OpenRouter:', AI_CONFIG.openrouter.model);
  console.log('Anthropic:', settings.aiProvider === 'anthropic' ? settings.aiModel : 'Not configured');
  console.log('Requesty:', AI_CONFIG.requesty.model);
  console.log('OpenAI:', AI_CONFIG.openai.model);
  console.log('Gemini:', AI_CONFIG.gemini.model);
  console.log('Vertex:', AI_CONFIG.vertex.model);
}

/**
 * Check if initial settings have been applied
 * Used to determine if we need to apply settings on startup
 */
export function areInitialSettingsApplied(): boolean {
  return initialSettingsApplied;
}

/**
 * Get the last successfully applied settings
 * This is useful for debugging when settings don't seem to be taking effect
 */
export function getLastAppliedSettings(): { provider?: string; model?: string; timestamp?: number } | null {
  return lastAppliedSettings;
}

/**
 * Force refresh of settings from scratch
 * This is a helper function to ensure settings are up to date
 * @returns Promise that resolves when refresh is complete
 */
export async function forceRefreshSettings(): Promise<boolean> {
  try {
    console.log('Forcing a complete refresh of settings from scratch');
    
    // Clear global settings
    if (typeof global !== 'undefined') {
      global.userSettings = undefined;
    }
    
    // Clear any cached settings to force immediate refresh
    console.log('Cleared cached settings for refresh');
    
    // Import the settings module dynamically to avoid circular dependencies
    const settingsModule = await import('../utils/settings');
    const freshSettings = await settingsModule.getSettings();
    
    // Apply the settings
    const success = await forceSettingsUpdate(freshSettings);
    
    // If successful, update global settings
    if (success && typeof global !== 'undefined') {
      global.userSettings = { ...freshSettings };
    }
    
    return success;
  } catch (error) {
    console.error('Error in forceRefreshSettings:', error);
    return false;
  }
}