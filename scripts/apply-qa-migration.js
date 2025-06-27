const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function applyMigration() {
  try {
    console.log('Applying Q&A migration...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        -- Add application_questions column to job_applications table
        ALTER TABLE job_applications 
        ADD COLUMN IF NOT EXISTS application_questions JSONB DEFAULT '[]'::jsonb;

        -- Add comment for documentation
        COMMENT ON COLUMN job_applications.application_questions IS 'Stores application-specific questions and answers as an array of {question, answer, category} objects';
      `
    });

    if (error) {
      console.error('Migration failed:', error);
      
      // Try alternative approach
      console.log('Trying alternative approach...');
      const { error: altError } = await supabase
        .from('job_applications')
        .select('id')
        .limit(1);
        
      if (!altError) {
        console.log('Table exists. The column might already exist or you may need to apply the migration manually through the Supabase dashboard.');
      }
    } else {
      console.log('Migration applied successfully!');
    }
  } catch (err) {
    console.error('Error:', err);
    console.log('\nTo apply this migration manually:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to the SQL Editor');
    console.log('3. Run the following SQL:');
    console.log(`
ALTER TABLE job_applications 
ADD COLUMN IF NOT EXISTS application_questions JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN job_applications.application_questions IS 'Stores application-specific questions and answers as an array of {question, answer, category} objects';
    `);
  }
}

applyMigration();