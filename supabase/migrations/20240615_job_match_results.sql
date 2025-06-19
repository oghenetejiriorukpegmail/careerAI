-- Create job_match_results table to store matching history
CREATE TABLE IF NOT EXISTS job_match_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
  job_description_id UUID REFERENCES job_descriptions(id) ON DELETE CASCADE,
  match_score FLOAT NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
  match_breakdown JSONB,
  match_reasons TEXT[],
  missing_skills TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure unique combination of user, resume, and job
  UNIQUE(user_id, resume_id, job_description_id)
);

-- Add RLS policies
ALTER TABLE job_match_results ENABLE ROW LEVEL SECURITY;

-- Users can only see their own match results
CREATE POLICY "Users can view own match results" ON job_match_results
  FOR SELECT USING (
    auth.uid()::text = user_id OR 
    auth.jwt()->>'session_id' = user_id
  );

-- Users can create their own match results
CREATE POLICY "Users can create own match results" ON job_match_results
  FOR INSERT WITH CHECK (
    auth.uid()::text = user_id OR 
    auth.jwt()->>'session_id' = user_id
  );

-- Users can update their own match results
CREATE POLICY "Users can update own match results" ON job_match_results
  FOR UPDATE USING (
    auth.uid()::text = user_id OR 
    auth.jwt()->>'session_id' = user_id
  );

-- Users can delete their own match results
CREATE POLICY "Users can delete own match results" ON job_match_results
  FOR DELETE USING (
    auth.uid()::text = user_id OR 
    auth.jwt()->>'session_id' = user_id
  );

-- Add columns to job_descriptions for match tracking
ALTER TABLE job_descriptions 
ADD COLUMN IF NOT EXISTS match_score FLOAT,
ADD COLUMN IF NOT EXISTS last_matched_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS matched_resume_id UUID REFERENCES resumes(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_job_match_results_user_id ON job_match_results(user_id);
CREATE INDEX IF NOT EXISTS idx_job_match_results_resume_id ON job_match_results(resume_id);
CREATE INDEX IF NOT EXISTS idx_job_match_results_job_description_id ON job_match_results(job_description_id);
CREATE INDEX IF NOT EXISTS idx_job_match_results_match_score ON job_match_results(match_score DESC);

-- Add is_primary column to resumes if not exists
ALTER TABLE resumes 
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

-- Ensure only one primary resume per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_resumes_primary_per_user 
ON resumes(user_id, is_primary) 
WHERE is_primary = true;