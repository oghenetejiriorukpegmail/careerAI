# Q&A Feature Migration Guide

## Database Migration

To enable the integrated Q&A feature, you need to add the `application_questions` column to the `job_applications` table.

### Manual Migration Steps

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Run the following SQL:

```sql
-- Add application_questions column to job_applications table
ALTER TABLE job_applications 
ADD COLUMN IF NOT EXISTS application_questions JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN job_applications.application_questions IS 'Stores application-specific questions and answers as an array of {question, answer, category} objects';
```

### Verification

After running the migration, you can verify it worked by running:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'job_applications' 
AND column_name = 'application_questions';
```

You should see the `application_questions` column with type `jsonb`.

## Feature Overview

The integrated Q&A feature allows users to:

1. **Add Questions**: Manually add custom questions or use quick-add common questions
2. **Generate AI Answers**: Automatically generate answers based on the user's resume
3. **Edit Answers**: Modify AI-generated answers to personalize them
4. **Categorize Questions**: Questions are automatically categorized (Experience, Skills, Behavioral, Company, Other)
5. **Export Questions**: Export all Q&A pairs as a text file for reference

## Usage

The Q&A feature is integrated directly into the Applications page. For each application:

1. Click the "Q&A" button to expand the Q&A section
2. Add questions manually or use the quick-add buttons
3. Click "Generate Answers" to have AI create answers based on your resume
4. Edit any answer by clicking the Edit button
5. Export all Q&A pairs using the Export button

## Technical Details

- Questions are stored in the `application_questions` JSONB column
- Each question object contains: `question`, `answer`, and `category`
- AI answers are generated using the Qwen model with strict truthfulness rules
- The feature maintains complete data integrity - no information is fabricated