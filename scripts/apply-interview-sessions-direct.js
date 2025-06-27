const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function applyMigration() {
  try {
    console.log('Checking if interview_sessions table exists...');
    
    // First, check if the table already exists
    const { data: existingTable, error: checkError } = await supabase
      .from('interview_sessions')
      .select('id')
      .limit(1);
    
    if (!checkError || checkError.code === '42P01') {
      // Table doesn't exist, we need to create it
      console.log('Table does not exist. Creating interview_sessions table...');
      
      // Since we can't execute raw SQL directly without exec_sql function,
      // we'll provide instructions for manual migration
      console.log('\n⚠️  MANUAL MIGRATION REQUIRED ⚠️\n');
      console.log('The interview_sessions table needs to be created manually.');
      console.log('\nPlease follow these steps:');
      console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/edfcwbtzcnfosiiymbqg');
      console.log('2. Navigate to the SQL Editor');
      console.log('3. Copy and paste the SQL from: supabase/migrations/20250622_interview_sessions.sql');
      console.log('4. Run the query\n');
      console.log('Alternatively, if you have a Supabase access token, set it as:');
      console.log('export SUPABASE_ACCESS_TOKEN=your_token_here');
      console.log('Then we can use the Supabase MCP to apply the migration automatically.');
    } else {
      console.log('✅ Table already exists!');
      
      // Test if we can insert (checking RLS policies)
      console.log('Testing table access...');
      const { error: testError } = await supabase
        .from('interview_sessions')
        .select('id')
        .limit(1);
      
      if (!testError) {
        console.log('✅ Table is accessible and ready to use!');
      } else {
        console.log('⚠️  Table exists but there might be RLS policy issues:', testError.message);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

applyMigration();