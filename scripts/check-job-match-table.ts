#!/usr/bin/env node

require('dotenv').config({ path: require('path').join(process.cwd(), '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkJobMatchTable() {
  console.log('Checking job_match_results table...\n');
  
  try {
    // Check if table exists by querying it
    const { data, error, count } = await supabase
      .from('job_match_results')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Error querying job_match_results table:', error);
      
      // Check if it's a "relation does not exist" error
      if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('\n⚠️  The job_match_results table does not exist!');
        console.log('📝 You need to run the migration to create it.');
        console.log('\nTo apply the migration manually:');
        console.log('1. Go to your Supabase dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Copy and run the contents of: supabase/migrations/20240615_job_match_results.sql');
      }
    } else {
      console.log('✅ job_match_results table exists');
      console.log(`📊 Current row count: ${count || 0}`);
      
      // Try to get table structure
      const { data: columns, error: columnsError } = await supabase
        .rpc('get_table_columns', { table_name: 'job_match_results' })
        .select('*');
        
      if (!columnsError && columns) {
        console.log('\n📋 Table columns:');
        columns.forEach((col: any) => {
          console.log(`  - ${col.column_name} (${col.data_type})`);
        });
      }
    }
    
    // Also check if job_descriptions has the match-related columns
    console.log('\n\nChecking job_descriptions table for match columns...');
    const { data: jobDesc, error: jobDescError } = await supabase
      .from('job_descriptions')
      .select('match_score, last_matched_at, matched_resume_id')
      .limit(1);
      
    if (jobDescError) {
      if (jobDescError.message.includes('column') && jobDescError.message.includes('does not exist')) {
        console.log('❌ job_descriptions table is missing match-related columns');
        console.log('📝 The migration needs to be applied to add these columns');
      } else {
        console.error('❌ Error checking job_descriptions:', jobDescError);
      }
    } else {
      console.log('✅ job_descriptions table has match-related columns');
    }
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the check
checkJobMatchTable();