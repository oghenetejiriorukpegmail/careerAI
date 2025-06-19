-- Migration script to ensure job_descriptions table has all required columns
-- Run this in your Supabase SQL Editor

-- First, check if the table exists and create it if it doesn't
CREATE TABLE IF NOT EXISTS job_descriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns one by one with IF NOT EXISTS logic
-- Note: PostgreSQL doesn't have ADD COLUMN IF NOT EXISTS directly, 
-- so we use a function to check and add columns

DO $$
BEGIN
  -- Check and add job_title column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'job_descriptions' AND column_name = 'job_title') THEN
    ALTER TABLE job_descriptions ADD COLUMN job_title TEXT;
    RAISE NOTICE 'Added column: job_title';
  ELSE
    RAISE NOTICE 'Column job_title already exists';
  END IF;

  -- Check and add company_name column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'job_descriptions' AND column_name = 'company_name') THEN
    ALTER TABLE job_descriptions ADD COLUMN company_name TEXT;
    RAISE NOTICE 'Added column: company_name';
  ELSE
    RAISE NOTICE 'Column company_name already exists';
  END IF;

  -- Check and add location column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'job_descriptions' AND column_name = 'location') THEN
    ALTER TABLE job_descriptions ADD COLUMN location TEXT;
    RAISE NOTICE 'Added column: location';
  ELSE
    RAISE NOTICE 'Column location already exists';
  END IF;

  -- Check and add url column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'job_descriptions' AND column_name = 'url') THEN
    ALTER TABLE job_descriptions ADD COLUMN url TEXT;
    RAISE NOTICE 'Added column: url';
  ELSE
    RAISE NOTICE 'Column url already exists';
  END IF;

  -- Check and add input_method column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'job_descriptions' AND column_name = 'input_method') THEN
    ALTER TABLE job_descriptions ADD COLUMN input_method TEXT NOT NULL DEFAULT 'manual';
    RAISE NOTICE 'Added column: input_method';
  ELSE
    RAISE NOTICE 'Column input_method already exists';
  END IF;

  -- Check and add employment_type column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'job_descriptions' AND column_name = 'employment_type') THEN
    ALTER TABLE job_descriptions ADD COLUMN employment_type TEXT;
    RAISE NOTICE 'Added column: employment_type';
  ELSE
    RAISE NOTICE 'Column employment_type already exists';
  END IF;

  -- Check and add salary_range column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'job_descriptions' AND column_name = 'salary_range') THEN
    ALTER TABLE job_descriptions ADD COLUMN salary_range TEXT;
    RAISE NOTICE 'Added column: salary_range';
  ELSE
    RAISE NOTICE 'Column salary_range already exists';
  END IF;

  -- Check and add posted_date column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'job_descriptions' AND column_name = 'posted_date') THEN
    ALTER TABLE job_descriptions ADD COLUMN posted_date TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Added column: posted_date';
  ELSE
    RAISE NOTICE 'Column posted_date already exists';
  END IF;

  -- Check and add application_deadline column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'job_descriptions' AND column_name = 'application_deadline') THEN
    ALTER TABLE job_descriptions ADD COLUMN application_deadline TIMESTAMP WITH TIME ZONE;
    RAISE NOTICE 'Added column: application_deadline';
  ELSE
    RAISE NOTICE 'Column application_deadline already exists';
  END IF;

  -- Check and add processing_status column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'job_descriptions' AND column_name = 'processing_status') THEN
    ALTER TABLE job_descriptions ADD COLUMN processing_status TEXT DEFAULT 'pending';
    RAISE NOTICE 'Added column: processing_status';
  ELSE
    RAISE NOTICE 'Column processing_status already exists';
  END IF;

  -- Check and add ai_provider column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'job_descriptions' AND column_name = 'ai_provider') THEN
    ALTER TABLE job_descriptions ADD COLUMN ai_provider TEXT;
    RAISE NOTICE 'Added column: ai_provider';
  ELSE
    RAISE NOTICE 'Column ai_provider already exists';
  END IF;

  -- Check and add ai_model column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'job_descriptions' AND column_name = 'ai_model') THEN
    ALTER TABLE job_descriptions ADD COLUMN ai_model TEXT;
    RAISE NOTICE 'Added column: ai_model';
  ELSE
    RAISE NOTICE 'Column ai_model already exists';
  END IF;

  -- Check and add match_score column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'job_descriptions' AND column_name = 'match_score') THEN
    ALTER TABLE job_descriptions ADD COLUMN match_score FLOAT;
    RAISE NOTICE 'Added column: match_score';
  ELSE
    RAISE NOTICE 'Column match_score already exists';
  END IF;

  -- Check and add updated_at column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'job_descriptions' AND column_name = 'updated_at') THEN
    ALTER TABLE job_descriptions ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
    RAISE NOTICE 'Added column: updated_at';
  ELSE
    RAISE NOTICE 'Column updated_at already exists';
  END IF;

  -- Check and add parsed_data column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'job_descriptions' AND column_name = 'parsed_data') THEN
    ALTER TABLE job_descriptions ADD COLUMN parsed_data JSONB;
    RAISE NOTICE 'Added column: parsed_data';
  ELSE
    RAISE NOTICE 'Column parsed_data already exists';
  END IF;

  -- Check and add raw_content column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'job_descriptions' AND column_name = 'raw_content') THEN
    ALTER TABLE job_descriptions ADD COLUMN raw_content TEXT;
    RAISE NOTICE 'Added column: raw_content';
  ELSE
    RAISE NOTICE 'Column raw_content already exists';
  END IF;

  -- Check if user_id is TEXT type (should support both UUID and session IDs)
  DECLARE
    user_id_type TEXT;
    constraint_name TEXT;
  BEGIN
    SELECT data_type INTO user_id_type 
    FROM information_schema.columns 
    WHERE table_name = 'job_descriptions' AND column_name = 'user_id';
    
    IF user_id_type = 'uuid' THEN
      RAISE NOTICE 'Converting user_id from UUID to TEXT to support session users';
      
      -- First, check if there's a foreign key constraint
      SELECT constraint_name INTO constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'job_descriptions' 
        AND tc.constraint_type = 'FOREIGN KEY'
        AND kcu.column_name = 'user_id'
      LIMIT 1;
      
      -- Drop foreign key constraint if it exists
      IF constraint_name IS NOT NULL THEN
        RAISE NOTICE 'Dropping foreign key constraint: %', constraint_name;
        EXECUTE 'ALTER TABLE job_descriptions DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Foreign key constraint dropped';
      END IF;
      
      -- Convert user_id column to TEXT
      ALTER TABLE job_descriptions ALTER COLUMN user_id TYPE TEXT;
      RAISE NOTICE 'Converted user_id column to TEXT type';
      
      -- Note: We don't recreate the foreign key constraint because we now support
      -- both UUID (for authenticated users) and session strings (for session users)
      -- The application handles validation at the business logic level
      
    ELSE
      RAISE NOTICE 'user_id column is already TEXT type';
    END IF;
  END;

END $$;

-- Enable RLS if not already enabled
ALTER TABLE job_descriptions ENABLE ROW LEVEL SECURITY;

-- Create or replace policies for job_descriptions
DROP POLICY IF EXISTS "Users can view their own job descriptions" ON job_descriptions;
DROP POLICY IF EXISTS "Users can insert their own job descriptions" ON job_descriptions;
DROP POLICY IF EXISTS "Users can update their own job descriptions" ON job_descriptions;
DROP POLICY IF EXISTS "Users can delete their own job descriptions" ON job_descriptions;

CREATE POLICY "Users can view their own job descriptions" 
  ON job_descriptions FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert their own job descriptions" 
  ON job_descriptions FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own job descriptions" 
  ON job_descriptions FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own job descriptions" 
  ON job_descriptions FOR DELETE USING (auth.uid()::text = user_id);

-- Show final table structure
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'job_descriptions' 
ORDER BY ordinal_position;

-- Show success message
DO $$
BEGIN
  RAISE NOTICE '=== JOB DESCRIPTIONS TABLE MIGRATION COMPLETE ===';
  RAISE NOTICE 'All required columns have been checked and added if missing.';
  RAISE NOTICE 'The table now supports both authenticated and session-based users.';
  RAISE NOTICE 'RLS policies have been updated.';
END $$;