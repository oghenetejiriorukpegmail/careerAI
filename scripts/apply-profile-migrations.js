const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigrations() {
  try {
    console.log('Applying profile migrations...\n');
    
    // Check current schema
    console.log('Checking current schema...');
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (testError) {
      console.error('Error checking schema:', testError);
      return;
    }
    
    const currentColumns = testData && testData.length > 0 ? Object.keys(testData[0]) : [];
    console.log('Current columns:', currentColumns);
    
    // Check which columns need to be added
    const columnsToAdd = [];
    const requiredColumns = ['work_authorization', 'city', 'state', 'country'];
    
    for (const column of requiredColumns) {
      if (!currentColumns.includes(column)) {
        columnsToAdd.push(column);
      }
    }
    
    if (columnsToAdd.length === 0) {
      console.log('\nAll required columns already exist!');
      return;
    }
    
    console.log('\nColumns to add:', columnsToAdd);
    console.log('\nPlease run these SQL commands in your Supabase dashboard:');
    console.log('================================================\n');
    
    if (columnsToAdd.includes('work_authorization')) {
      console.log('-- Add work authorization column');
      console.log('ALTER TABLE profiles ADD COLUMN work_authorization TEXT;\n');
    }
    
    if (columnsToAdd.includes('city') || columnsToAdd.includes('state') || columnsToAdd.includes('country')) {
      console.log('-- Add location detail columns');
      const locationColumns = [];
      if (columnsToAdd.includes('city')) locationColumns.push('ADD COLUMN city TEXT');
      if (columnsToAdd.includes('state')) locationColumns.push('ADD COLUMN state TEXT');
      if (columnsToAdd.includes('country')) locationColumns.push('ADD COLUMN country TEXT');
      
      console.log(`ALTER TABLE profiles\n${locationColumns.join(',\n')};\n`);
    }
    
    console.log('================================================');
    console.log('\nAfter running these commands, your profile fields will be ready to use.');
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

applyMigrations();