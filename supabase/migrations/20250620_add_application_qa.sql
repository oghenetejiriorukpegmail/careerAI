-- Add application_questions column to job_applications table
ALTER TABLE job_applications 
ADD COLUMN IF NOT EXISTS application_questions JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN job_applications.application_questions IS 'Stores application-specific questions and answers as an array of {question, answer, category} objects';