const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    console.log('Applying work authorization migration...');
    
    // Add work_authorization column to profiles table
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE profiles 
        ADD COLUMN IF NOT EXISTS work_authorization TEXT;
      `
    });

    if (error) {
      console.error('Error applying migration:', error);
      
      // If exec_sql doesn't exist, try a different approach
      console.log('Trying alternative approach...');
      
      // Check if column exists by trying to query it
      const { data: testData, error: testError } = await supabase
        .from('profiles')
        .select('work_authorization')
        .limit(1);
      
      if (testError && testError.message.includes('column') && testError.message.includes('does not exist')) {
        console.error('Column does not exist. Please add it manually through Supabase dashboard:');
        console.log('ALTER TABLE profiles ADD COLUMN work_authorization TEXT;');
      } else if (!testError) {
        console.log('Column already exists!');
      } else {
        console.error('Unexpected error:', testError);
      }
    } else {
      console.log('Migration applied successfully!');
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

applyMigration();