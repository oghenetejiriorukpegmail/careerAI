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
CREATE INDEX idx_interview_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX idx_interview_sessions_created_at ON interview_sessions(created_at DESC);

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