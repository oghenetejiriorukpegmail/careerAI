const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigrations() {
  try {
    console.log('Testing current schema...\n');
    
    // Test query to see current columns
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.error('Error testing schema:', testError);
      return;
    }
    
    const currentColumns = testData && testData.length > 0 ? Object.keys(testData[0]) : [];
    console.log('Current columns:', currentColumns);
    
    // Test if we can update with new columns
    console.log('\nTesting column updates...');
    
    // Get a test user
    const { data: users } = await supabase.auth.admin.listUsers();
    if (!users || users.users.length === 0) {
      console.log('No users found to test with');
      return;
    }
    
    const testUserId = users.users[0].id;
    console.log('Testing with user:', testUserId);
    
    // Try to update with new columns
    const updates = {
      updated_at: new Date().toISOString()
    };
    
    // Test work_authorization
    if (!currentColumns.includes('work_authorization')) {
      console.log('\nwork_authorization column is missing');
      updates.work_authorization = 'Test';
    }
    
    // Test city, state, country
    if (!currentColumns.includes('city')) {
      console.log('city column is missing');
      updates.city = 'Test City';
    }
    if (!currentColumns.includes('state')) {
      console.log('state column is missing'); 
      updates.state = 'Test State';
    }
    if (!currentColumns.includes('country')) {
      console.log('country column is missing');
      updates.country = 'Test Country';
    }
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', testUserId);
    
    if (updateError) {
      console.log('\nUpdate failed:', updateError.message);
      console.log('\nThe columns need to be added manually through Supabase dashboard.');
      console.log('\nSQL to run:');
      console.log('============================================');
      console.log(`
-- Add work authorization column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS work_authorization TEXT;

-- Add location detail columns  
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS country TEXT;
      `);
      console.log('============================================');
    } else {
      console.log('\nAll columns are already present and working!');
    }
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

applyMigrations();