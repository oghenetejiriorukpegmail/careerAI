# Database Migration Scripts

This directory contains scripts to ensure the CareerAI database schema is up to date with all required columns.

## Files

- **`migrate-job-descriptions.sql`** - Manual SQL migration script for Supabase SQL Editor
- **`run-migration.js`** - Automated migration runner (requires running app)
- **`README.md`** - This documentation

## Quick Start

### Option 1: Automated Migration (Recommended)

If your Next.js app is running:

```bash
# Check current schema
node scripts/run-migration.js check

# Run migration if needed
node scripts/run-migration.js migrate
```

### Option 2: Manual SQL Migration

1. Open your [Supabase SQL Editor](https://supabase.com/dashboard/project/_/sql)
2. Copy and paste the contents of `migrate-job-descriptions.sql`
3. Click "Run" to execute the migration

## What the Migration Does

### For `job_descriptions` table:

**Ensures these columns exist:**
- `id` - UUID (Primary Key, auto-generated)
- `user_id` - TEXT (supports both UUID and session IDs)
- `job_title` - TEXT
- `company_name` - TEXT  
- `location` - TEXT
- `description` - TEXT (NOT NULL)
- `url` - TEXT
- `input_method` - TEXT (NOT NULL, default 'manual')
- `employment_type` - TEXT
- `salary_range` - TEXT
- `posted_date` - TIMESTAMP WITH TIME ZONE
- `application_deadline` - TIMESTAMP WITH TIME ZONE
- `processing_status` - TEXT (default 'pending')
- `ai_provider` - TEXT
- `ai_model` - TEXT
- `match_score` - FLOAT
- `parsed_data` - JSONB
- `raw_content` - TEXT
- `created_at` - TIMESTAMP WITH TIME ZONE (auto-generated)
- `updated_at` - TIMESTAMP WITH TIME ZONE (auto-generated)

**Additional changes:**
- Converts `user_id` from UUID to TEXT type (if needed)
- Enables Row Level Security (RLS)
- Creates/updates RLS policies for data access
- Provides detailed logging of changes made

## Migration Status

The migration scripts are **safe to run multiple times**. They will:
- ✅ Only add missing columns
- ✅ Skip columns that already exist
- ✅ Preserve existing data
- ✅ Provide detailed logs of what was done

## Troubleshooting

### App Shows "Column not found" errors

This means the migration hasn't been run yet. Use one of the migration options above.

### Foreign Key Constraint Error

If you get an error like:
```
ERROR: foreign key constraint "job_descriptions_user_id_fkey" cannot be implemented
DETAIL: Key columns "user_id" and "id" are of incompatible types: text and uuid.
```

**Quick Fix:**
```bash
# Run the specific constraint fix first
psql -f scripts/fix-user-id-constraint.sql
# Then run the full migration
node scripts/run-migration.js migrate
```

**Or in Supabase SQL Editor:**
1. Copy and paste `scripts/fix-user-id-constraint.sql`
2. Run it first
3. Then run the main migration script

### "Permission denied" errors

Ensure you're using the Supabase service role key, not the anon key, for admin operations.

### Migration script fails to connect

For the automated migration:
1. Ensure your Next.js app is running (`npm run dev`)
2. Check that `NEXT_PUBLIC_API_URL` is set correctly in your environment
3. Verify Supabase credentials are configured

### Manual SQL migration preferred

Some environments may require manual migration via Supabase SQL Editor for security reasons. The `migrate-job-descriptions.sql` file contains the exact same logic as the automated migration.

## Verification

After running the migration, you can verify it worked by:

1. **Via automated script:**
   ```bash
   node scripts/run-migration.js check
   ```

2. **Via Supabase SQL Editor:**
   ```sql
   SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns 
   WHERE table_name = 'job_descriptions' 
   ORDER BY ordinal_position;
   ```

3. **Via app functionality:**
   - Try adding a job opportunity at `/dashboard/job-description/new`
   - Check that it saves successfully without errors
   - Verify it appears in `/dashboard/job-opportunities`

## Support

If you encounter issues:

1. Check the browser console and server logs for specific error messages
2. Verify your Supabase project settings and credentials
3. Ensure you have the necessary database permissions
4. Try the manual SQL migration if the automated version fails

## Migration History

- **v1.0** - Initial job_descriptions table schema
- **v1.1** - Added AI attribution columns (`ai_provider`, `ai_model`)
- **v1.2** - Added job processing columns (`input_method`, `processing_status`, `raw_content`)
- **v1.3** - Added enhanced job details (`employment_type`, `salary_range`, `deadlines`, `match_score`)
- **v1.4** - Converted `user_id` to TEXT for session user support