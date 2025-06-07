-- Drop existing policies and tables if they exist (to start fresh)
DROP POLICY IF EXISTS "Users can view their own jobs" ON job_processing;
DROP POLICY IF EXISTS "Users can create their own jobs" ON job_processing;
DROP POLICY IF EXISTS "Service role has full access" ON job_processing;
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Allow notification creation" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;

DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS job_processing CASCADE;

-- Create job_processing table for async AI operations
CREATE TABLE job_processing (
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
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own jobs" ON job_processing
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Allow service role to do everything (for backend processing)
CREATE POLICY "Service role has full access" ON job_processing
  FOR ALL 
  USING (auth.role() = 'service_role');

-- Create notifications table for real-time updates
CREATE TABLE notifications (
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

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Allow service role to create notifications
CREATE POLICY "Service role can create notifications" ON notifications
  FOR INSERT 
  WITH CHECK (auth.role() = 'service_role');

-- Allow authenticated users to create notifications (for frontend)
CREATE POLICY "Authenticated users can create notifications" ON notifications
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Grant necessary permissions
GRANT ALL ON job_processing TO authenticated;
GRANT ALL ON notifications TO authenticated;
GRANT ALL ON job_processing TO service_role;
GRANT ALL ON notifications TO service_role;

-- Create function to check if user plan exists (might be needed by the app)
CREATE OR REPLACE FUNCTION get_user_plan(user_id UUID)
RETURNS TEXT AS $$
BEGIN
  -- For now, return 'FREE' as default
  -- You can update this later when you have a proper subscription system
  RETURN 'FREE';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify tables were created
SELECT 'job_processing table created' AS status WHERE EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'job_processing'
);

SELECT 'notifications table created' AS status WHERE EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'notifications'
);