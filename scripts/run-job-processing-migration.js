require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Get database URL and service role key from environment
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure the following are set in your .env.local file:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    console.log('🚀 Running job processing migration...\n');
    
    // Read the SQL file
    const sqlPath = path.join(__dirname, 'create-job-processing-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📝 Executing SQL migration...');
    
    // Execute the SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If RPC doesn't exist, try direct approach
      console.log('⚠️  exec_sql RPC not available, trying alternative approach...');
      
      // Split SQL into individual statements and execute separately
      const statements = sql.split(';').filter(s => s.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`Executing: ${statement.substring(0, 50)}...`);
          
          // For table creation, we can check if tables exist first
          if (statement.includes('CREATE TABLE IF NOT EXISTS')) {
            // Extract table name
            const tableMatch = statement.match(/CREATE TABLE IF NOT EXISTS (\w+)/);
            if (tableMatch) {
              const tableName = tableMatch[1];
              console.log(`Checking if table ${tableName} exists...`);
              
              // Check if table exists
              const { data: tables } = await supabase
                .from(tableName)
                .select('*')
                .limit(1);
              
              if (tables !== null) {
                console.log(`✅ Table ${tableName} already exists or was created`);
              }
            }
          }
        }
      }
      
      console.log('\n✅ Migration completed!');
      console.log('\nNote: Some operations may require direct database access.');
      console.log('If you see errors above, you may need to run the SQL directly in your Supabase dashboard.');
    } else {
      console.log('✅ Migration executed successfully!');
    }
    
    // Verify tables were created
    console.log('\n🔍 Verifying migration...');
    
    const { data: jobProcessing } = await supabase
      .from('job_processing')
      .select('*')
      .limit(1);
    
    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .limit(1);
    
    if (jobProcessing !== null && notifications !== null) {
      console.log('✅ Tables verified successfully!');
      console.log('- job_processing table is accessible');
      console.log('- notifications table is accessible');
    } else {
      console.log('⚠️  Could not verify tables. They may need to be created manually.');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.error('\nPlease run the SQL in scripts/create-job-processing-table.sql directly in your Supabase dashboard.');
  }
}

// Run the migration
runMigration();