-- Add CASCADE delete to foreign key constraints
-- This allows parent records to be deleted and automatically removes child records

-- Drop existing foreign key constraints
ALTER TABLE generated_documents 
DROP CONSTRAINT IF EXISTS generated_documents_job_description_id_fkey;

ALTER TABLE job_applications 
DROP CONSTRAINT IF EXISTS job_applications_job_description_id_fkey;

-- Recreate with CASCADE delete
ALTER TABLE generated_documents
ADD CONSTRAINT generated_documents_job_description_id_fkey 
FOREIGN KEY (job_description_id) 
REFERENCES job_descriptions(id) 
ON DELETE CASCADE;

ALTER TABLE job_applications
ADD CONSTRAINT job_applications_job_description_id_fkey 
FOREIGN KEY (job_description_id) 
REFERENCES job_descriptions(id) 
ON DELETE CASCADE;

-- Also add CASCADE for resume and cover letter references in job_applications
ALTER TABLE job_applications 
DROP CONSTRAINT IF EXISTS job_applications_resume_id_fkey,
DROP CONSTRAINT IF EXISTS job_applications_cover_letter_id_fkey;

ALTER TABLE job_applications
ADD CONSTRAINT job_applications_resume_id_fkey 
FOREIGN KEY (resume_id) 
REFERENCES generated_documents(id) 
ON DELETE SET NULL;

ALTER TABLE job_applications
ADD CONSTRAINT job_applications_cover_letter_id_fkey 
FOREIGN KEY (cover_letter_id) 
REFERENCES generated_documents(id) 
ON DELETE SET NULL;