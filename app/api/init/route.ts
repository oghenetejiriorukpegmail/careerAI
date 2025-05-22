import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { initializeStorageBuckets } from '@/lib/supabase/storage';
import { supabaseAdmin } from '@/lib/supabase/client';

/**
 * API route to initialize Supabase resources
 * This includes creating storage buckets and schema
 */
export async function GET() {
  // Get current user session from cookies
  const supabase = createRouteHandlerClient({ cookies });
  const { data: { session } } = await supabase.auth.getSession();
  
  // Note: Initialization requires admin privileges
  console.log('Initializing Supabase resources...');
  try {
    // Initialize storage buckets
    const { success, error } = await initializeStorageBuckets();
    
    if (!success) {
      return NextResponse.json({ success: false, message: 'Failed to initialize storage buckets', error }, { status: 500 });
    }
    
    // Check database schema
    const { error: schemaError } = await supabaseAdmin.from('profiles').select('count');
    if (schemaError) {
      return NextResponse.json({ 
        success: false, 
        message: 'Database schema not properly set up. Please run the schema SQL.', 
        error: schemaError 
      }, { status: 500 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Supabase resources initialized successfully',
      buckets: ['resumes', 'user_files', 'generated']
    });
  } catch (error) {
    console.error('Error in init API route:', error);
    return NextResponse.json({ success: false, message: 'Server error', error }, { status: 500 });
  }
}