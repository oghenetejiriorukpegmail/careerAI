-- Create job_processing table for async AI operations
CREATE TABLE IF NOT EXISTS job_processing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'resume_parse', 'cover_letter', 'resume_generate'
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  input_data JSONB NOT NULL, -- Store input parameters
  result_data JSONB, -- Store processing results
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB -- Additional metadata like file names, job IDs, etc
);

-- Add indexes for performance
CREATE INDEX idx_job_processing_user_id ON job_processing(user_id);
CREATE INDEX idx_job_processing_status ON job_processing(status);
CREATE INDEX idx_job_processing_type ON job_processing(type);
CREATE INDEX idx_job_processing_created_at ON job_processing(created_at DESC);

-- Enable RLS
ALTER TABLE job_processing ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own jobs" ON job_processing
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own jobs" ON job_processing
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can manage all jobs" ON job_processing
  FOR ALL USING (true);

-- Create notifications table for real-time updates
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_id UUID REFERENCES job_processing(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'job_completed', 'job_failed', etc
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  metadata JSONB
);

-- Add indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can create notifications" ON notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);