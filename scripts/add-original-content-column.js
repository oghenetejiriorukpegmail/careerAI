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
    console.log('Testing if txt_file_path column already exists...\n');
    
    // Test if column exists by trying to select it
    const { data: testData, error: testError } = await supabase
      .from('generated_documents')
      .select('id, txt_file_path')
      .limit(1);
    
    if (!testError) {
      console.log('✅ txt_file_path column already exists');
      return;
    }
    
    console.log('txt_file_path column does not exist, checking table structure...');
    
    // Check what columns exist
    const { data: existingData, error: existingError } = await supabase
      .from('generated_documents')
      .select('*')
      .limit(1);
    
    if (existingError) {
      console.error('Error checking table:', existingError);
      return;
    }
    
    console.log('Current columns:', existingData && existingData.length > 0 ? Object.keys(existingData[0]) : 'No data');
    
    // For now, let's proceed with the application assuming the column might not exist
    // and handle it gracefully in the application code
    console.log('⚠️  txt_file_path column does not exist. Will handle gracefully in application code.');
    
  } catch (error) {
    console.error('Migration check failed:', error);
  }
}

addTxtFilePathColumn();