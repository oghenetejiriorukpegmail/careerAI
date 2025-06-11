-- Fix Storage Bucket Policies for CareerAI
-- This fixes the issue where user IDs are in the second folder level, not the first

-- First, drop existing policies that are incorrect
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- =============================================================================
-- User Files Bucket Policies (Fixed)
-- =============================================================================

-- Allow authenticated users to view files in their user folder
CREATE POLICY "Users can view own files in user_files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'user_files' AND 
  auth.role() = 'authenticated' AND
  (
    -- For files directly in user folder
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- For files in subfolders like resumes/user_id/file.pdf
    auth.uid()::text = (storage.foldername(name))[2]
  )
);

-- Allow authenticated users to upload files to their user folder
CREATE POLICY "Users can upload to user_files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'user_files' AND 
  auth.role() = 'authenticated' AND
  (
    -- For files directly in user folder
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    -- For files in subfolders like resumes/user_id/file.pdf
    auth.uid()::text = (storage.foldername(name))[2]
  )
);

-- Allow authenticated users to update their own files
CREATE POLICY "Users can update own files in user_files" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'user_files' AND 
  auth.role() = 'authenticated' AND
  (
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    auth.uid()::text = (storage.foldername(name))[2]
  )
)
WITH CHECK (
  bucket_id = 'user_files' AND 
  auth.role() = 'authenticated' AND
  (
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    auth.uid()::text = (storage.foldername(name))[2]
  )
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own files in user_files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'user_files' AND 
  auth.role() = 'authenticated' AND
  (
    auth.uid()::text = (storage.foldername(name))[1]
    OR
    auth.uid()::text = (storage.foldername(name))[2]
  )
);

-- Service role bypass (for backend operations)
CREATE POLICY "Service role bypass for user_files" ON storage.objects
FOR ALL USING (
  bucket_id = 'user_files' AND
  auth.role() = 'service_role'
);