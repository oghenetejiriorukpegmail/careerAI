/**
 * Utility function to directly update the AI configuration
 * This is a simplified version extracted from clear-cache.ts
 * to avoid circular dependency issues
 */

import { UserSettings } from '../utils/settings';
import { AI_CONFIG } from './config';

/**
 * Directly updates the AI configuration with the provided settings
 */
export function updateAIConfig(settings: UserSettings): void {
  try {
    console.log('Updating AI configuration with settings:', JSON.stringify({
      provider: settings.aiProvider,
      model: settings.aiModel
    }));
    
    // Update the specific provider that's active
    switch (settings.aiProvider) {
      case 'openrouter':
        AI_CONFIG.openrouter.model = settings.aiModel;
        console.log(`Set OpenRouter model to ${settings.aiModel}`);
        break;
      case 'anthropic':
        // AI_CONFIG.anthropic.model = settings.aiModel;
        console.warn('Anthropic provider not configured yet');
        break;
      case 'requesty':
        AI_CONFIG.requesty.model = settings.aiModel;
        console.log(`Set Requesty model to ${settings.aiModel}`);
        break;
      case 'openai':
        AI_CONFIG.openai.model = settings.aiModel;
        console.log(`Set OpenAI model to ${settings.aiModel}`);
        break;
      case 'google':
        AI_CONFIG.gemini.model = settings.aiModel;
        console.log(`Set Google model to ${settings.aiModel}`);
        break;
      case 'vertex':
        AI_CONFIG.vertex.model = settings.aiModel;
        console.log(`Set Vertex model to ${settings.aiModel}`);
        break;
      default:
        console.warn(`Unknown AI provider: ${settings.aiProvider}`);
    }
    
    // Also update global settings cache for server-side usage
    if (typeof global !== 'undefined') {
      global.userSettings = { ...settings };
      
      // Reset refresh timestamp
      if (global._aiConfigState) {
        global._aiConfigState.lastSettingsRefresh = 0;
      } else {
        global._aiConfigState = { lastSettingsRefresh: 0 };
      }
    }
  } catch (error) {
    console.error('Error updating AI configuration:', error);
  }
}