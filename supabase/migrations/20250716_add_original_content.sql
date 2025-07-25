-- Add original_content column to store the AI-generated structured data
-- This will allow TXT exports to have identical content to PDF exports

ALTER TABLE generated_documents 
ADD COLUMN IF NOT EXISTS original_content JSONB;

-- Add comment for documentation
COMMENT ON COLUMN generated_documents.original_content IS 'Stores the original AI-generated structured data (ResumeData or CoverLetterData) used to create the document';