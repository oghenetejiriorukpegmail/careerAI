import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthentication } from '@/lib/supabase/server-client';
import { UserSettings } from '@/lib/utils/settings';
import { AI_CONFIG } from '@/lib/ai/config';
import { updateServerSettings } from '@/lib/ai/settings-loader';
import { updateAIConfig } from '@/lib/ai/update-config';

// Apply settings to the AI configuration
export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/settings/apply - Authentication disabled for development');
    
    // Parse request body - catch JSON parse errors explicitly
    let settings: UserSettings;
    try {
      settings = await request.json();
    } catch (parseError) {
      console.error('Error parsing request JSON in settings/apply:', parseError);
      return NextResponse.json({ 
        error: 'Invalid JSON in request body',
        message: parseError instanceof Error ? parseError.message : 'Unknown parsing error' 
      }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validate settings
    if (!settings.aiProvider) {
      return NextResponse.json({ error: 'AI Provider is required' }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!settings.aiModel) {
      return NextResponse.json({ error: 'AI Model is required' }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Add a timestamp for synchronization if not already present
    if (!settings.updatedAt) {
      settings.updatedAt = Date.now();
    }
    
    // Log settings being applied
    console.log('Applying settings:', JSON.stringify({
      provider: settings.aiProvider,
      model: settings.aiModel,
      documentAiOnly: settings.documentAiOnly,
      enableLogging: settings.enableLogging
    }));
    
    // Before update - log current config
    console.log('Before update - AI configuration:', {
      openrouter: AI_CONFIG.openrouter.model,
      requesty: AI_CONFIG.requesty.model,
      openai: AI_CONFIG.openai.model,
      gemini: AI_CONFIG.gemini.model,
      vertex: AI_CONFIG.vertex.model
    });
    
    // Reset all model configs to defaults first to avoid confusion
    AI_CONFIG.openrouter.model = 'qwen/qwen3-235b-a22b:free'; 
    AI_CONFIG.requesty.model = 'anthropic/claude-sonnet-4';
    AI_CONFIG.openai.model = 'gpt-4';
    AI_CONFIG.gemini.model = 'gemini-1.5-pro';
    AI_CONFIG.vertex.model = 'vertex/anthropic/claude-sonnet-4@us-east5';
    
    // Update AI_CONFIG directly based on the provider
    switch (settings.aiProvider) {
      case 'openrouter':
        AI_CONFIG.openrouter.model = settings.aiModel;
        break;
      case 'anthropic':
        // Anthropic direct API is handled by queryAI function, not in AI_CONFIG
        console.log('Anthropic provider selected - handled by queryAI function');
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
    }
    
    // Also use the utility function to ensure all config properties are updated
    updateAIConfig(settings);
    
    // After update - verify config
    console.log('After update - AI configuration:', {
      openrouter: AI_CONFIG.openrouter.model,
      requesty: AI_CONFIG.requesty.model,
      openai: AI_CONFIG.openai.model,
      gemini: AI_CONFIG.gemini.model,
      vertex: AI_CONFIG.vertex.model
    });
    
    // Final verification of the active model
    const activeModel = (() => {
      switch (settings.aiProvider) {
        case 'openrouter': return AI_CONFIG.openrouter.model;
        case 'anthropic': return settings.aiModel; // Anthropic handled by queryAI
        case 'requesty': return AI_CONFIG.requesty.model;
        case 'openai': return AI_CONFIG.openai.model;
        case 'google': return AI_CONFIG.gemini.model;
        case 'vertex': return AI_CONFIG.vertex.model;
        default: return 'unknown';
      }
    })();
    
    // Verify the model was set correctly
    if (activeModel !== settings.aiModel) {
      console.error(`ERROR: Model mismatch after applying settings - expected ${settings.aiModel} but got ${activeModel}`);
      
      // Last resort direct fix
      switch (settings.aiProvider) {
        case 'openrouter':
          AI_CONFIG.openrouter.model = settings.aiModel;
          break;
        case 'anthropic':
          // Anthropic provider not configured yet
          console.warn('Anthropic provider selected but not configured');
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
      }
      
      // Check again after fix
      const fixedModel = (() => {
        switch (settings.aiProvider) {
          case 'openrouter': return AI_CONFIG.openrouter.model;
          case 'anthropic': return 'claude-2';
          case 'requesty': return AI_CONFIG.requesty.model;
          case 'openai': return AI_CONFIG.openai.model;
          case 'google': return AI_CONFIG.gemini.model;
          case 'vertex': return AI_CONFIG.vertex.model;
          default: return 'unknown';
        }
      })();
      
      if (fixedModel === settings.aiModel) {
        console.log(`FIXED: Model correctly set to ${settings.aiModel} after direct fix`);
      } else {
        console.error(`CRITICAL ERROR: Unable to set model correctly after multiple attempts`);
      }
    } else {
      console.log(`SUCCESS: ${settings.aiProvider} model correctly set to ${settings.aiModel}`);
    }
    
    // Update global settings cache
    if (typeof global !== 'undefined') {
      // Clear any existing settings cache
      global.userSettings = undefined;
      
      // Set fresh settings
      global.userSettings = { ...settings };
      console.log('Updated global settings cache with new settings');
      
      // Reset refresh timestamp
      if (global._aiConfigState) {
        global._aiConfigState.lastSettingsRefresh = 0;
        global._aiConfigState.lastResetTimestamp = Date.now();
      } else {
        global._aiConfigState = { 
          lastSettingsRefresh: 0,
          lastResetTimestamp: Date.now()
        };
      }
    }
    
    // Update server-side settings cache
    updateServerSettings(settings);
    
    // Return success response with details
    return NextResponse.json({ 
      success: true, 
      message: 'Settings applied successfully',
      appliedSettings: {
        provider: settings.aiProvider,
        model: settings.aiModel,
        documentAiOnly: settings.documentAiOnly,
        loggingEnabled: settings.enableLogging,
        currentActiveModel: activeModel
      },
      updatedAt: settings.updatedAt
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in settings/apply API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}