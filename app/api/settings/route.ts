import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServiceRoleClient, createServerClient } from '@/lib/supabase/server-client';
import { defaultSettings, UserSettings } from '@/lib/utils/settings';
import { loadServerSettings } from '@/lib/ai/settings-loader';
import { updateAIConfig } from '@/lib/ai/update-config';
import { AI_CONFIG } from '@/lib/ai/config';

// In-memory cache for session-based settings
// This provides persistence across requests during the same server session
const sessionSettingsCache = new Map<string, UserSettings>();

// Generate or retrieve a session-based user identifier
function getSessionUserId(cookies: any): string {
  let sessionUserId = cookies.get('session_user_id')?.value;
  
  if (!sessionUserId) {
    // Generate a unique session ID using timestamp and random string
    sessionUserId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }
  
  return sessionUserId;
}

// Get settings from database using service role
export async function GET() {
  try {
    console.log('GET /api/settings - Using service role for database operations');
    
    const cookieStore = cookies();
    
    // Get session user ID (either authenticated user or session-based ID)
    const supabase = createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    let userId: string;
    let userType: string;
    
    if (session?.user) {
      userId = session.user.id; // This is already a string UUID
      userType = 'authenticated';
      console.log(`Loading settings for authenticated user: ${userId}`);
    } else {
      userId = getSessionUserId(cookieStore);
      userType = 'session';
      console.log(`Loading settings for session user: ${userId}`);
    }
    
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
      
      if (error && error.code !== 'PGRST116') { // PGRST116: Row not found
        console.error('Error fetching user settings from database:', error);
        // Fall back to cache
        if (sessionSettingsCache.has(userId)) {
          responseSettings = sessionSettingsCache.get(userId)!;
          console.log(`Loaded settings from memory cache for ${userType} user (database error)`);
        } else {
          console.log(`No cached settings found for ${userType} user, using defaults (database error)`);
        }
      } else if (data?.settings) {
        responseSettings = data.settings;
        console.log(`Loaded settings from database for ${userType} user`);
        // Update cache with database data
        sessionSettingsCache.set(userId, responseSettings);
      } else {
        console.log(`No existing settings found in database for ${userType} user, checking cache`);
        // Check cache as fallback
        if (sessionSettingsCache.has(userId)) {
          responseSettings = sessionSettingsCache.get(userId)!;
          console.log(`Loaded settings from memory cache for ${userType} user`);
        } else {
          console.log(`No cached settings found for ${userType} user, using defaults`);
        }
      }
    } catch (dbError) {
      console.error('Database error fetching settings:', dbError);
      // Fall back to cache
      if (sessionSettingsCache.has(userId)) {
        responseSettings = sessionSettingsCache.get(userId)!;
        console.log(`Loaded settings from memory cache for ${userType} user (database exception)`);
      } else {
        console.log(`No cached settings found for ${userType} user, using defaults (database exception)`);
      }
    }
    
    if (!responseSettings.updatedAt) {
      responseSettings.updatedAt = Date.now();
    }
    
    // Set session user ID cookie if it's a new session user
    const response = NextResponse.json(responseSettings, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (userType === 'session') {
      response.cookies.set('session_user_id', userId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      });
    }
    
    return response;
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

// Update settings using service role
export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/settings - Using service role for database operations');
    
    const cookieStore = cookies();
    
    // Get session user ID (either authenticated user or session-based ID)
    const supabase = createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    let userId: string;
    let userType: string;
    
    if (session?.user) {
      userId = session.user.id;
      userType = 'authenticated';
      console.log(`Saving settings for authenticated user: ${userId}`);
    } else {
      userId = getSessionUserId(cookieStore);
      userType = 'session';
      console.log(`Saving settings for session user: ${userId}`);
    }
    
    let settings: UserSettings;
    try {
      settings = await request.json();
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
    
    if (!settings.aiProvider) {
      return NextResponse.json({ error: 'Invalid settings', message: 'AI Provider is required.' }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!settings.aiModel) {
      return NextResponse.json({ error: 'Invalid settings', message: 'AI Model is required.' }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    if (!settings.updatedAt) {
      settings.updatedAt = Date.now();
    }
    
    console.log('Saving settings:', JSON.stringify({
      provider: settings.aiProvider,
      model: settings.aiModel,
      updatedAt: settings.updatedAt,
      userType: userType,
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
    sessionSettingsCache.set(userId, { ...settings });
    console.log(`Settings saved to memory cache for ${userType} user: ${userId}`);
    
    // Save to database using service role
    let dbResult = { success: false, message: 'Unknown error' };
    try {
      console.log(`Saving settings to database for ${userType} user: ${userId}`);
      
      // Use service role client to bypass RLS and access database
      const supabaseAdmin = createServiceRoleClient();
      const { error: upsertError } = await supabaseAdmin
        .from('user_settings')
        .upsert({
          user_id: userId,
          settings,
          updated_at: new Date().toISOString()
        }, { 
          onConflict: 'user_id',
          returning: 'minimal'
        });
        
      if (upsertError) {
        console.error('Error saving to database:', upsertError);
        dbResult = { success: false, message: `Database error: ${upsertError.message}` };
      } else {
        console.log(`Settings saved to database successfully for ${userType} user`);
        dbResult = { success: true, message: `Settings saved to database for ${userType} user` };
      }
    } catch (dbError) {
      console.error('Unexpected database error:', dbError);
      dbResult = { success: false, message: 'Unexpected database error' };
    }
    
    // Prepare response with session cookie if needed
    const response = NextResponse.json({ 
      success: true, 
      settings,
      updatedAt: settings.updatedAt,
      database: dbResult,
      userType: userType,
      message: dbResult.success ? 
        `Settings applied and saved to database (${userType} user)` : 
        `Settings applied to memory cache only (${userType} user)`
    }, { headers: { 'Content-Type': 'application/json' } });
    
    // Set session user ID cookie if it's a new session user
    if (userType === 'session') {
      response.cookies.set('session_user_id', userId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30 // 30 days
      });
    }
    
    return response;
  } catch (error) {
    console.error('Unhandled error in POST /api/settings:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      message: 'An unexpected error occurred while saving settings.'
    }, { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}