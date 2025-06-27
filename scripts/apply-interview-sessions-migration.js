const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function applyMigration() {
  try {
    console.log('Applying interview sessions migration...');
    
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
        -- Create interview_sessions table
        CREATE TABLE IF NOT EXISTS interview_sessions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          topics TEXT[] NOT NULL DEFAULT '{}',
          context JSONB DEFAULT '{}',
          transcript JSONB DEFAULT '[]',
          started_at TIMESTAMPTZ DEFAULT NOW(),
          completed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON interview_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_interview_sessions_created_at ON interview_sessions(created_at DESC);

        -- Enable RLS
        ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;

        -- Create RLS policies
        CREATE POLICY "Users can view their own interview sessions"
          ON interview_sessions
          FOR SELECT
          USING (auth.uid() = user_id);

        CREATE POLICY "Users can create their own interview sessions"
          ON interview_sessions
          FOR INSERT
          WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update their own interview sessions"
          ON interview_sessions
          FOR UPDATE
          USING (auth.uid() = user_id)
          WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can delete their own interview sessions"
          ON interview_sessions
          FOR DELETE
          USING (auth.uid() = user_id);

        -- Add comment for documentation
        COMMENT ON TABLE interview_sessions IS 'Stores interview practice session data including questions, answers, and feedback';
        COMMENT ON COLUMN interview_sessions.topics IS 'Array of interview topics covered in the session';
        COMMENT ON COLUMN interview_sessions.context IS 'Job context information (company, role, job description)';
        COMMENT ON COLUMN interview_sessions.transcript IS 'Array of question/answer/feedback objects from the session';
      `
    });

    if (error) {
      console.error('Migration failed:', error);
      
      // Try alternative approach - check if table exists
      console.log('Checking if table already exists...');
      const { error: checkError } = await supabase
        .from('interview_sessions')
        .select('id')
        .limit(1);
        
      if (!checkError || checkError.code === 'PGRST116') {
        console.log('Table might already exist or you may need to apply the migration manually through the Supabase dashboard.');
      }
    } else {
      console.log('Migration applied successfully!');
    }
  } catch (err) {
    console.error('Error:', err);
    console.log('\nTo apply this migration manually:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to the SQL Editor');
    console.log('3. Copy and run the SQL from: supabase/migrations/20250622_interview_sessions.sql');
  }
}

applyMigration();