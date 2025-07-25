-- Add txt_file_path column to generated_documents table
ALTER TABLE generated_documents 
ADD COLUMN txt_file_path TEXT;

-- Add comment for documentation
COMMENT ON COLUMN generated_documents.txt_file_path IS 'File path for the plain text version of the generated document';