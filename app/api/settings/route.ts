import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient, createServerClient } from '@/lib/supabase/server-client';
import { defaultSettings, UserSettings } from '@/lib/utils/settings';
import { loadServerSettings } from '@/lib/ai/settings-loader';
import { updateAIConfig } from '@/lib/ai/update-config';
import { AI_CONFIG } from '@/lib/ai/config';
import { settingsSchema, safeValidateInput } from '@/lib/validation/schemas';
import { z } from 'zod';

// In-memory cache for authenticated user settings only
const userSettingsCache = new Map<string, UserSettings>();

// Get settings from database - requires authentication
export async function GET() {
  try {
    console.log('GET /api/settings - Requires authentication');
    
    // Get authenticated user only
    const supabase = createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'You must be logged in to access settings.'
      }, { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const userId = session.user.id;
    console.log(`Loading settings for authenticated user: ${userId}`);
    
    let responseSettings = loadServerSettings(); // Default/fallback settings
    
    // Check database first, then fall back to cache
    try {
      // Use service role client to bypass RLS and access database
      const supabaseAdmin = createServiceRoleClient();
      const { data, error } = await supabaseAdmin
        .from('user_settings')
        .select('settings')
        .eq('user_id', userId)
        .single();
        
      if (!error && data?.settings) {
        responseSettings = data.settings;
        userSettingsCache.set(userId, responseSettings);
        console.log('Loaded settings from database for authenticated user');
      } else {
        // Check cache if database doesn't have settings
        if (userSettingsCache.has(userId)) {
          responseSettings = userSettingsCache.get(userId)!;
          console.log('Loaded settings from memory cache for authenticated user');
        } else {
          console.log('No cached settings found for authenticated user, using defaults');
        }
      }
    } catch (dbError) {
      console.error('Database error fetching settings:', dbError);
      // Fall back to cache
      if (userSettingsCache.has(userId)) {
        responseSettings = userSettingsCache.get(userId)!;
        console.log('Loaded settings from memory cache for authenticated user (database exception)');
      } else {
        console.log('No cached settings found for authenticated user, using defaults (database exception)');
      }
    }
    
    if (!responseSettings.updatedAt) {
      responseSettings.updatedAt = Date.now();
    }
    
    return NextResponse.json(responseSettings, {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Unhandled error in GET /api/settings:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred while retrieving settings.'
    }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Update settings - requires authentication
export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/settings - Requires authentication');
    
    // Get authenticated user only
    const supabase = createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'You must be logged in to update settings.'
      }, { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const userId = session.user.id;
    console.log(`Saving settings for authenticated user: ${userId}`);
    
    let rawData: any;
    try {
      rawData = await request.json();
    } catch (parseError) {
      console.error('Error parsing request JSON in POST /api/settings:', parseError);
      return NextResponse.json({ 
        error: 'Invalid request format',
        message: 'The request body was not valid JSON.'
      }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Create AI settings schema (separate from full settings)
    const aiSettingsSchema = z.object({
      aiProvider: z.enum(['openai', 'gemini', 'openrouter', 'requesty']),
      aiModel: z.string().min(1),
      documentAiOnly: z.boolean().optional(),
      enableLogging: z.boolean().optional(),
      showAiAttribution: z.boolean().optional(),
      openrouterApiKey: z.string().optional(),
      openaiApiKey: z.string().optional(),
      geminiApiKey: z.string().optional(),
      updatedAt: z.number().optional()
    });
    
    // Validate AI settings
    const validation = safeValidateInput(aiSettingsSchema, rawData);
    if (!validation.success) {
      return NextResponse.json({ 
        error: 'Invalid settings',
        message: validation.error
      }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const settings = {
      ...validation.data,
      documentAiOnly: false,
      enableLogging: true,
    } as UserSettings;
    
    if (!settings.updatedAt) {
      settings.updatedAt = Date.now();
    }
    
    console.log('Saving settings:', JSON.stringify({
      provider: settings.aiProvider,
      model: settings.aiModel,
      updatedAt: settings.updatedAt,
      userId: userId
    }));
    
    // Apply settings to AI configuration first
    try {
      updateAIConfig(settings);
      console.log('Applied settings directly to AI configuration');
    } catch (configError) {
      console.warn('Error updating live AI configuration after saving settings:', configError);
    }
    
    // Update global cache
    if (typeof global !== 'undefined') {
      global.userSettings = { ...settings };
      console.log('Updated global settings cache with new settings');
      if (global._aiConfigState) {
        global._aiConfigState.lastSettingsRefresh = 0;
      }
    }
    
    // Save to memory cache for immediate access
    userSettingsCache.set(userId, { ...settings });
    console.log(`Settings saved to memory cache for authenticated user: ${userId}`);
    
    // Save to database using service role
    let dbResult = { success: false, message: 'Unknown error' };
    try {
      console.log(`Saving settings to database for authenticated user: ${userId}`);
      
      // Use service role client to bypass RLS and access database
      const supabaseAdmin = createServiceRoleClient();
      const { error: upsertError } = await supabaseAdmin
        .from('user_settings')
        .upsert({
          user_id: userId,
          settings,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'user_id'
        });
        
      if (upsertError) {
        console.error('Error saving to database:', upsertError);
        dbResult = { success: false, message: `Database error: ${upsertError.message}` };
      } else {
        console.log('Settings saved to database successfully for authenticated user');
        dbResult = { success: true, message: 'Settings saved to database for authenticated user' };
      }
    } catch (dbError) {
      console.error('Exception saving settings to database:', dbError);
      dbResult = { 
        success: false, 
        message: `Database exception: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`
      };
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Settings saved successfully',
      timestamp: settings.updatedAt,
      provider: settings.aiProvider,
      model: settings.aiModel,
      database: dbResult
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Unhandled error in POST /api/settings:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred while saving settings.',
      details: error instanceof Error ? error.stack : undefined
    }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}