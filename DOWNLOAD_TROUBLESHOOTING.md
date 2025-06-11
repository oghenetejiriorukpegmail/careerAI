# Document Download Troubleshooting Guide

## Issue Summary
Users are unable to download generated resumes and cover letters from the Applications page.

## Root Causes Identified

### 1. Storage Bucket Policy Mismatch
The storage policies were expecting user IDs in the first folder level, but the actual file structure is:
- `resumes/{user_id}/filename.pdf`
- `cover-letters/{user_id}/filename.pdf`

The policies were checking `(storage.foldername(name))[1]` which returns "resumes" or "cover-letters", not the user ID.

### 2. File Storage Verification
Debug script confirmed that:
- Recent files ARE being saved correctly to storage
- File paths in the database match the actual storage locations
- Files can be accessed with service role credentials

## Solutions Implemented

### 1. Enhanced Download Functionality
Updated `/app/dashboard/applications/page.tsx` to:
- Add better error handling and logging
- Implement fallback to API endpoint if direct storage access fails
- Provide clearer error messages to users

### 2. Improved View Functionality
- Added fallback to blob URL if signed URL generation fails
- Better pop-up blocker detection and user guidance
- Extended blob URL cleanup timeout for better user experience

### 3. Storage Policy Fix
Created `/scripts/fix-storage-policies.sql` to:
- Check both first and second folder levels for user ID
- Ensure authenticated users can access their files regardless of subfolder structure
- Add service role bypass for backend operations

## How to Apply the Fix

1. **Run the storage policy fix in Supabase:**
   ```sql
   -- Execute the contents of scripts/fix-storage-policies.sql in your Supabase SQL editor
   ```

2. **Deploy the updated code:**
   - The applications page now has better error handling
   - Users will see more helpful error messages
   - Fallback mechanisms ensure downloads work even if primary method fails

3. **Test the fix:**
   ```bash
   # Run the debug script to verify file existence
   node scripts/debug-documents.js
   
   # Test storage access
   node scripts/test-storage-access.js
   ```

## Monitoring

To monitor if users are still experiencing issues:

1. Check browser console for errors starting with "Storage download error:" or "View error:"
2. Look for toast notifications with "Download Failed" or "View Failed"
3. Check if fallback to API endpoint is being triggered frequently

## Additional Notes

- Files are stored in the `user_files` bucket, not separate buckets
- Each user's files are organized by their user ID
- The download endpoint at `/api/documents/[id]/download` serves as a backup method
- Pop-up blockers may interfere with the view functionality - users should be advised to allow pop-ups