# Interview Prep Feature Setup

## Database Migration Required

The interview prep feature requires a database table that needs to be created. Follow these steps:

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Run the following SQL:

```sql
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
```

### Option 2: Using Migration Script

Run the provided migration script:

```bash
node scripts/apply-interview-sessions-migration.js
```

Note: This might fail if your Supabase instance doesn't have the `exec_sql` function enabled.

### Option 3: Using Supabase CLI

If you have Supabase CLI configured and linked to your project:

```bash
npx supabase db push
```

## Troubleshooting

### 500 Errors on API Routes

If you're getting 500 errors on the interview prep API routes, it's likely because:

1. The `interview_sessions` table doesn't exist yet - run the migration above
2. Authentication is not set up properly - ensure you're logged in
3. The Supabase connection is not configured - check your environment variables

### Continuous Re-rendering

The console.log statements have been removed from the component to prevent excessive logging. If you still see performance issues, check:

1. React Developer Tools for unnecessary re-renders
2. Ensure state updates are not in infinite loops
3. Check for missing dependencies in useEffect hooks

## Features

The interview prep feature includes:

- Topic selection (behavioral, technical, situational, company-fit, career, role-specific)
- Custom topic addition
- Context-aware questions based on job description, company, and role
- AI-powered answer evaluation and feedback
- Session transcript tracking
- Progress saving (when database table is created)