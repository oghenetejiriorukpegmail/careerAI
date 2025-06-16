-- Add columns to job_descriptions for match tracking
ALTER TABLE job_descriptions 
ADD COLUMN IF NOT EXISTS match_score FLOAT,
ADD COLUMN IF NOT EXISTS last_matched_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS matched_resume_id UUID REFERENCES resumes(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_job_descriptions_match_score ON job_descriptions(match_score DESC);
CREATE INDEX IF NOT EXISTS idx_job_descriptions_last_matched_at ON job_descriptions(last_matched_at DESC);

-- Add is_primary column to resumes if not exists
ALTER TABLE resumes 
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT false;

-- Ensure only one primary resume per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_resumes_primary_per_user 
ON resumes(user_id, is_primary) 
WHERE is_primary = true;