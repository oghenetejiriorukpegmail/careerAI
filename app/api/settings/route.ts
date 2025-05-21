import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, verifyAuthentication } from '@/lib/supabase/server-client';
import { defaultSettings, UserSettings } from '@/lib/utils/settings';
import { loadServerSettings } from '@/lib/ai/settings-loader';
import { updateAIConfig } from '@/lib/ai/update-config';
import { AI_CONFIG } from '@/lib/ai/config';

// Get settings from database or env vars if not set
export async function GET() {
  try {
    // Verify authentication
    const { authenticated, user } = await verifyAuthentication();
    
    if (!authenticated || !user) {
      console.log('User not authenticated, returning 401 unauthorized for GET /api/settings');
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'You must be logged in to access settings.'
      }, { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const supabase = createServerClient();
    let data, error;

    try {
      // Get settings from database
      ({ data, error } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', user.id)
        .single());
      
      if (error && error.code !== 'PGRST116') { // PGRST116: Row not found, not an error for us here
        console.error('Error fetching user settings in GET /api/settings:', error);
        return NextResponse.json({ 
          error: 'Failed to retrieve settings',
          message: 'Could not retrieve your settings at this time. Please try again later.'
        }, { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    } catch (dbError) {
      // Catch any other unexpected errors during DB operation
      console.error('Unexpected database error during settings fetch in GET /api/settings:', dbError);
      return NextResponse.json({ 
        error: 'Database error',
        message: 'An unexpected error occurred while fetching your settings.'
      }, { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    
    const serverSettings = loadServerSettings();
    const responseSettings = data?.settings || serverSettings;
    
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

// Update settings
export async function POST(request: NextRequest) {
  try {
    const { authenticated, user } = await verifyAuthentication();
    
    if (!authenticated || !user) {
      console.log('User not authenticated, returning 401 unauthorized for POST /api/settings');
      return NextResponse.json({ 
        error: 'Authentication required',
        message: 'You must be logged in to update settings.'
      }, { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
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
    
    console.log(`Saving settings to database for user ${user.id}:`, JSON.stringify({
      provider: settings.aiProvider,
      model: settings.aiModel,
      updatedAt: settings.updatedAt
    }));
    
    const supabase = createServerClient();
    
    console.log(`Executing upsert on user_settings table for user ${user.id}`);
    // console.log(`Settings object for upsert:`, JSON.stringify(settings, null, 2)); // Can be verbose
    
    const { error: upsertError } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        settings,
        updated_at: new Date().toISOString()
      }, { 
        onConflict: 'user_id',
        returning: 'minimal'
      });
      
    let mutableError = upsertError;

    if (mutableError) {
      console.error('Error during initial upsert in POST /api/settings:', mutableError);
      console.log(`Upsert failed for user ${user.id}. Attempting fallback...`); // Keep this for flow visibility
      let fallbackError = null;

      try {
        const { data: existingRow, error: checkError } = await supabase
          .from('user_settings')
          .select('id') 
          .eq('user_id', user.id)
          .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
          console.error('Error selecting user settings for fallback in POST /api/settings:', checkError);
          fallbackError = checkError; 
        } else if (checkError && checkError.code === 'PGRST116') {
          console.log(`No existing row for user ${user.id} (PGRST116), trying fallback insert.`);
          const { error: insertError } = await supabase
            .from('user_settings')
            .insert({ user_id: user.id, settings, updated_at: new Date().toISOString() });
          if (insertError) {
            console.error('Error during fallback insert in POST /api/settings:', insertError);
            fallbackError = insertError;
          } else {
            console.log(`Fallback insert successful for user ${user.id}`);
            mutableError = null; 
          }
        } else if (existingRow) {
          console.log(`Existing row found for user ${user.id}, attempting fallback update.`);
          const { error: updateError } = await supabase
            .from('user_settings')
            .update({ settings, updated_at: new Date().toISOString() })
            .eq('user_id', user.id);
          if (updateError) {
            console.error('Error during fallback update in POST /api/settings:', updateError);
            fallbackError = updateError;
          } else {
            console.log(`Fallback update successful for user ${user.id}`);
            mutableError = null;
          }
        } else {
           console.log(`No existing row for user ${user.id} (unexpected case after maybeSingle), trying fallback insert.`);
           const { error: insertError } = await supabase
            .from('user_settings')
            .insert({ user_id: user.id, settings, updated_at: new Date().toISOString() });
          if (insertError) {
            console.error('Error during fallback insert (unexpected case) in POST /api/settings:', insertError);
            fallbackError = insertError;
          } else {
            console.log(`Fallback insert (unexpected case) successful for user ${user.id}`);
            mutableError = null;
          }
        }
      } catch (dbFallbackError) {
        console.error('Unexpected database error during fallback logic in POST /api/settings:', dbFallbackError);
        fallbackError = dbFallbackError; // Assign if it's a generic error
      }

      if (fallbackError) {
        mutableError = fallbackError;
      }
    }

    if (mutableError) {
      console.error('Failed to save settings after all attempts in POST /api/settings:', mutableError);
      return NextResponse.json({ 
        error: 'Failed to save settings',
        message: 'Your settings could not be saved at this time. Please try again later.'
      }, { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    
    try {
      updateAIConfig(settings);
      console.log('Applied settings directly to AI configuration');
      // console.log('Current AI configuration after update:', AI_CONFIG); // Can be verbose
    } catch (configError) {
      console.warn('Error updating live AI configuration after saving settings:', configError);
    }
    
    if (typeof global !== 'undefined') {
      global.userSettings = { ...settings };
      console.log('Updated global settings cache with new settings');
      if (global._aiConfigState) {
        global._aiConfigState.lastSettingsRefresh = 0;
      }
    }
    
    try {
      console.log(`Verifying settings for user ${user.id} after save...`);
      const { data: verificationData, error: verificationError } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', user.id)
        .single();
        
      if (verificationError) {
        console.error('Error verifying saved settings in POST /api/settings:', verificationError);
        return NextResponse.json({ 
          success: true, 
          settings, // original settings from request
          updatedAt: settings.updatedAt,
          verification: 'failed',
          message: 'Settings were applied, but verification after save encountered an issue.'
        }, { headers: { 'Content-Type': 'application/json' } });
      } else if (!verificationData?.settings) {
        console.error('Error verifying saved settings in POST /api/settings: verificationData or verificationData.settings is null/undefined');
        return NextResponse.json({
          success: true,
          settings, // original settings from request
          updatedAt: settings.updatedAt,
          verification: 'failed', 
          message: 'Settings were applied, but verification found missing or corrupted settings data in the database.'
        }, { headers: { 'Content-Type': 'application/json' } });
      } else {
        // Current success logic:
        // console.log(`Verification successful for user ${user.id}:`, verificationData);
        return NextResponse.json({ 
          success: true, 
          settings, // original settings from request
          updatedAt: settings.updatedAt,
          verification: 'success',
          dbSettings: { 
            provider: verificationData.settings.aiProvider,
            model: verificationData.settings.aiModel
          }
        }, { headers: { 'Content-Type': 'application/json' } });
      }
    } catch (unexpectedVerificationError) {
      console.error('Unexpected error during settings verification in POST /api/settings:', unexpectedVerificationError);
      return NextResponse.json({ 
        success: true, 
        settings,
        updatedAt: settings.updatedAt,
        verification: 'error',
        message: 'Settings were applied, but an unexpected error occurred during verification.'
      }, { headers: { 'Content-Type': 'application/json' } });
    }
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