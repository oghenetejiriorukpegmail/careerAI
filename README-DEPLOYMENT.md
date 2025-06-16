# CareerAI Deployment Guide

## Prerequisites

Before deploying, ensure you have:
1. Supabase project set up with proper tables
2. Required environment variables configured
3. AI provider API keys (OpenRouter, Gemini)

## Important Database Migration

The job matching feature requires the `job_match_results` table. Run this SQL in your Supabase SQL Editor:

```sql
-- Drop existing table if it exists (be careful in production!)
DROP TABLE IF EXISTS job_match_results CASCADE;

-- Create job_match_results table with proper structure
CREATE TABLE job_match_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL,
    resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
    job_description_id UUID NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
    match_score INTEGER NOT NULL CHECK (match_score >= 0 AND match_score <= 100),
    match_breakdown JSONB,
    match_reasons TEXT[],
    missing_skills TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure one match result per resume-job combination for a user
    UNIQUE(user_id, resume_id, job_description_id)
);

-- Create indexes for performance
CREATE INDEX idx_job_match_results_user_id ON job_match_results(user_id);
CREATE INDEX idx_job_match_results_resume_id ON job_match_results(resume_id);
CREATE INDEX idx_job_match_results_job_id ON job_match_results(job_description_id);
CREATE INDEX idx_job_match_results_score ON job_match_results(match_score DESC);
CREATE INDEX idx_job_match_results_created_at ON job_match_results(created_at DESC);

-- Enable RLS
ALTER TABLE job_match_results ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own match results"
    ON job_match_results
    FOR SELECT
    USING (
        auth.uid()::text = user_id OR
        auth.jwt() ->> 'email' = user_id
    );

CREATE POLICY "Service role can insert match results"
    ON job_match_results
    FOR INSERT
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can update match results"
    ON job_match_results
    FOR UPDATE
    USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can delete match results"
    ON job_match_results
    FOR DELETE
    USING (auth.jwt() ->> 'role' = 'service_role');

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_job_match_results_updated_at
    BEFORE UPDATE ON job_match_results
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Also add missing columns to job_descriptions if needed
ALTER TABLE job_descriptions 
ADD COLUMN IF NOT EXISTS match_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_matched_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS matched_resume_id UUID REFERENCES resumes(id);
```

## Environment Variables

Ensure all required environment variables are set:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Providers
OPENROUTER_API_KEY=your_openrouter_key
GEMINI_API_KEY=your_gemini_key

# App Settings
NEXT_PUBLIC_APP_URL=https://your-app-url.com
```

## Deployment Steps

1. Run database migrations (see above)
2. Build the application: `npm run build`
3. Deploy to your hosting platform
4. Verify all API endpoints are working
5. Test document generation and job matching features

## Post-Deployment Checklist

- [ ] Database migrations applied
- [ ] Environment variables configured
- [ ] Storage buckets created in Supabase
- [ ] RLS policies verified
- [ ] API endpoints tested
- [ ] Document generation working
- [ ] Job matching feature functional