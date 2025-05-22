# Database Schema Update Required

## Current Status

The CareerAI application requires database schema updates for two key features:

1. **Resume Upload & Processing**: Missing columns in the `resumes` table prevent saving processed resumes
2. **Settings Storage**: Schema mismatch in the `user_settings` table prevents persistent settings storage

## Resume Processing Issue

The resume upload functionality works (processing and AI parsing), but cannot save to the database due to missing columns.

### Required Resume Table Update

```sql
-- Add missing columns to the resumes table (if they don't exist)
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS extracted_text TEXT;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending';
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS ai_provider TEXT;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS ai_model TEXT;
```

These columns are needed for:
- `file_size`: Store the size of the uploaded file in bytes
- `extracted_text`: Store the raw text extracted from the document by Google Document AI
- `processing_status`: Track the status of resume processing ('pending', 'processing', 'completed', 'failed')
- `ai_provider`: Store which AI provider processed the resume (e.g., 'openrouter', 'google')
- `ai_model`: Store which specific AI model was used (e.g., 'claude-3-7-sonnet', 'gemini-1.5-pro')

## Settings Storage Issue

The existing `user_settings` table expects UUID format for the `user_id` column, but our implementation supports both:
- **Authenticated users**: UUID format (e.g., `8e26b305-7f6c-4ffa-8f9e-3e6bcd66ad83`)
- **Session users**: String format (e.g., `session_1747868467813_abc123`)

## Required Database Updates

To enable full functionality, run these SQL commands in your Supabase SQL editor:

### 1. Resume Table Update (Required for Resume Upload)

```sql
-- Add missing columns to the resumes table (if they don't exist)
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS extracted_text TEXT;
ALTER TABLE resumes ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending';
```

### 2. Settings Table Update (Required for Settings Persistence)

```sql
-- Drop existing user_settings table if it exists with UUID constraint
DROP TABLE IF EXISTS user_settings CASCADE;

-- Create user_settings table for storing AI configuration and user preferences
-- This table supports both authenticated users and session-based users
CREATE TABLE user_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL UNIQUE, -- Using TEXT to support both UUID and session IDs
  settings JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for user_settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for user_settings (service role bypasses these)
CREATE POLICY "Users can view their own settings" 
  ON user_settings FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert their own settings" 
  ON user_settings FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own settings" 
  ON user_settings FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own settings" 
  ON user_settings FOR DELETE USING (auth.uid()::text = user_id);
```

## What This Enables

After running the schema updates:

### ✅ **Current Features (Working Now)**
- ✅ Resume processing with Google Document AI
- ✅ AI-powered resume parsing and structuring  
- ✅ Settings applied to AI configuration in real-time
- ✅ Memory-based settings persistence during server session
- ✅ Session user tracking via HTTP-only cookies
- ✅ Service role database operations (ready for use)

### 🎯 **Enhanced Features (After Schema Updates)**
- 🎯 **Resume Database Storage**: Processed resumes saved to database
- 🎯 **Resume Management Dashboard**: View and manage uploaded resumes
- 🎯 **Permanent Settings Persistence**: Settings saved to Supabase database
- 🎯 **Cross-Session Persistence**: Data persists across server restarts
- 🎯 **User History**: Track changes and uploads over time

## Testing

After applying the schema updates, test both features:

### Resume Upload Testing
1. Navigate to `/dashboard/resume/new`
2. Upload a PDF or DOCX resume
3. Wait for processing to complete
4. Navigate to `/dashboard/resume` 
5. You should see your uploaded resume listed

### Settings Persistence Testing
```bash
# Test POST - should show database success
curl -X POST "http://localhost:3000/api/settings" \
  -H "Content-Type: application/json" \
  -d '{"aiProvider":"openrouter","aiModel":"anthropic/claude-3.7-sonnet","documentAiOnly":false,"enableLogging":true}'

# Expected response:
# "database": {"success": true, "message": "Settings saved to database for session user"}
```

## Current Memory Storage

Until the schema is updated, settings are stored in:
1. **Global memory cache**: `global.userSettings`
2. **Session cache**: `sessionSettingsCache` Map
3. **AI configuration**: Direct updates to `AI_CONFIG` object

This provides functional persistence during the current server session.

## Security Notes

- The application uses **Supabase service role** for database operations
- **RLS policies are bypassed** by service role (intentional for this use case)
- **Session IDs are HTTP-only cookies** with 30-day expiration
- **No sensitive data** is stored in settings (only AI provider preferences)