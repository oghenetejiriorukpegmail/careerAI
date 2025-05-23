import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthentication } from '@/lib/supabase/server-client';
import { AI_CONFIG } from '@/lib/ai/config';

/**
 * Clear all settings and AI configuration caches
 * This is used when settings are not being properly applied
 */
export async function POST(request: NextRequest) {
  try {
    // Verify authentication - only authenticated users or admin can clear all caches
    const { authenticated, user } = await verifyAuthentication();
    
    // For security, require authentication or admin token
    const adminToken = request.headers.get('x-admin-token');
    const isAdmin = adminToken === process.env.ADMIN_API_KEY;
    
    if (!authenticated && !isAdmin) {
      return NextResponse.json({ 
        error: 'Authentication required to clear caches' 
      }, { status: 401 });
    }
    
    console.log(`Clearing all caches - requested by ${authenticated ? `user ${user?.id}` : 'admin'}`);
    
    // 1. Clear global settings cache
    if (typeof global !== 'undefined') {
      // Clear all settings-related properties in global scope
      // Clear specific global variables we know about
      if (global.userSettings) {
        console.log('Clearing global.userSettings');
        global.userSettings = undefined;
      }
      
      if (global._aiConfigState) {
        console.log('Clearing global._aiConfigState');
        global._aiConfigState = undefined;
      }
      
      // Type-safe way to handle dynamic properties
      try {
        // Use any type for dynamic access (for other potential properties)
        const globalAny = global as any;
        
        for (const key in globalAny) {
          if (
            key.toLowerCase().includes('settings') || 
            key.toLowerCase().includes('config') || 
            key.toLowerCase().includes('ai')
          ) {
            if (key !== 'userSettings' && key !== '_aiConfigState') {
              console.log(`Clearing global.${key}`);
              globalAny[key] = undefined;
            }
          }
        }
      } catch (err) {
        console.warn('Error clearing additional global variables:', err);
      }
      
      // Create a fresh _aiConfigState with initialization values
      global._aiConfigState = { 
        lastSettingsRefresh: 0,
        settingsRefreshCount: 0,
        lastResetTimestamp: Date.now()
      };
      
      console.log('All global settings caches cleared');
    }
    
    // 2. Reset all AI_CONFIG provider models to defaults
    AI_CONFIG.openrouter.model = 'qwen/qwen3-235b-a22b:free';
    // AI_CONFIG.anthropic.model = 'claude-3-7-sonnet-20250219';
    AI_CONFIG.requesty.model = 'anthropic/claude-3-7-sonnet-20250219';
    AI_CONFIG.openai.model = 'gpt-4';
    AI_CONFIG.gemini.model = 'gemini-1.5-pro';
    AI_CONFIG.vertex.model = 'vertex/anthropic/claude-3-7-sonnet-latest@us-east5';
    
    console.log('AI provider configuration reset to defaults');
    
    // 3. Force garbage collection if available
    try {
      // @ts-ignore - gc() is available when Node is run with --expose-gc flag
      if (global && typeof global.gc === 'function') {
        // @ts-ignore
        global.gc();
        console.log('Garbage collection triggered');
      }
    } catch (clearError) {
      console.warn('Error triggering garbage collection:', clearError);
    }
    
    // Return success with timestamp
    return NextResponse.json({ 
      success: true, 
      message: 'All settings caches cleared',
      timestamp: Date.now(),
      aiConfigReset: true,
      globalCachesCleared: true,
      moduleCachesReset: false
    });
  } catch (error) {
    console.error('Error in settings/clear-cache API:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}