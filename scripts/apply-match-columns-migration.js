#!/usr/bin/env node

require('dotenv').config({ path: require('path').join(process.cwd(), '.env.local') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function applyMigration() {
  console.log('Applying match columns migration...\n');
  
  try {
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'supabase/migrations/20240615_add_match_columns.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📝 Migration SQL:');
    console.log(migrationSQL);
    console.log('\n');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });
    
    if (error) {
      // If RPC doesn't exist, provide manual instructions
      console.error('❌ Could not apply migration automatically:', error.message);
      console.log('\n📋 Please apply this migration manually:');
      console.log('1. Go to your Supabase dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the following SQL:');
      console.log('\n```sql');
      console.log(migrationSQL);
      console.log('```\n');
      console.log('4. Click "Run" to execute the migration');
    } else {
      console.log('✅ Migration applied successfully!');
      
      // Verify the columns were added
      const { data: testData, error: testError } = await supabase
        .from('job_descriptions')
        .select('match_score, last_matched_at, matched_resume_id')
        .limit(1);
        
      if (!testError) {
        console.log('✅ Verified: Match columns have been added to job_descriptions table');
      }
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the migration
applyMigration();