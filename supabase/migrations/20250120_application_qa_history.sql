-- Create application_qa_history table
CREATE TABLE IF NOT EXISTS application_qa_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_description_id UUID NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
  cover_letter_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  confidence_score DECIMAL(3,2) NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for performance
CREATE INDEX idx_application_qa_history_user_id ON application_qa_history(user_id);
CREATE INDEX idx_application_qa_history_job_description_id ON application_qa_history(job_description_id);
CREATE INDEX idx_application_qa_history_created_at ON application_qa_history(created_at DESC);

-- Add RLS policies
ALTER TABLE application_qa_history ENABLE ROW LEVEL SECURITY;

-- Users can only see and create their own Q&A history
CREATE POLICY "Users can view own Q&A history"
  ON application_qa_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own Q&A history"
  ON application_qa_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- No update or delete policies - Q&A history should be immutable

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_application_qa_history_updated_at
  BEFORE UPDATE ON application_qa_history
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE application_qa_history IS 'Stores history of Q&A interactions for job applications';
COMMENT ON COLUMN application_qa_history.confidence_score IS 'AI confidence score from 0 to 1';
COMMENT ON COLUMN application_qa_history.metadata IS 'JSON object containing keyPointsUsed and suggestedFollowUp';