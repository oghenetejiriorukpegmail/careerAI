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

async function addTxtFilePathColumn() {
  try {
    console.log('Adding txt_file_path column to generated_documents table...');
    
    // Use the RPC function to execute raw SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$ 
        BEGIN 
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'generated_documents' 
            AND column_name = 'txt_file_path'
          ) THEN
            ALTER TABLE generated_documents ADD COLUMN txt_file_path TEXT;
            RAISE NOTICE 'Column txt_file_path added successfully';
          ELSE
            RAISE NOTICE 'Column txt_file_path already exists';
          END IF;
        END $$;
      `
    });
    
    if (error) {
      console.error('Error executing SQL:', error);
      
      // Try a simpler approach - direct query
      console.log('Trying alternative approach...');
      
      // First check if column exists
      const { data: columns, error: colError } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_name', 'generated_documents')
        .eq('column_name', 'txt_file_path');
      
      if (colError) {
        console.error('Could not check if column exists:', colError);
        return;
      }
      
      if (columns && columns.length > 0) {
        console.log('✅ txt_file_path column already exists');
        return;
      }
      
      console.log('Column does not exist, but cannot add it via API');
      console.log('Please run this SQL manually in your Supabase SQL editor:');
      console.log('ALTER TABLE generated_documents ADD COLUMN txt_file_path TEXT;');
      
    } else {
      console.log('✅ Migration completed successfully');
      console.log('Result:', data);
    }
    
  } catch (error) {
    console.error('Migration failed:', error);
    console.log('Please run this SQL manually in your Supabase SQL editor:');
    console.log('ALTER TABLE generated_documents ADD COLUMN txt_file_path TEXT;');
  }
}

addTxtFilePathColumn();