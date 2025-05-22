-- Fix foreign key constraint issue for job_descriptions.user_id
-- This script safely converts user_id from UUID to TEXT to support session users

DO $$
DECLARE
    constraint_name TEXT;
    user_id_type TEXT;
BEGIN
    RAISE NOTICE 'Starting user_id column migration for job_descriptions table...';
    
    -- Check current user_id column type
    SELECT data_type INTO user_id_type 
    FROM information_schema.columns 
    WHERE table_name = 'job_descriptions' AND column_name = 'user_id';
    
    RAISE NOTICE 'Current user_id column type: %', user_id_type;
    
    IF user_id_type = 'uuid' THEN
        RAISE NOTICE 'Converting user_id from UUID to TEXT to support session users...';
        
        -- Find and drop foreign key constraint on user_id
        SELECT tc.constraint_name INTO constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = 'job_descriptions' 
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = 'user_id'
        LIMIT 1;
        
        IF constraint_name IS NOT NULL THEN
            RAISE NOTICE 'Found foreign key constraint: %', constraint_name;
            RAISE NOTICE 'Dropping foreign key constraint...';
            EXECUTE 'ALTER TABLE job_descriptions DROP CONSTRAINT ' || constraint_name;
            RAISE NOTICE 'Foreign key constraint dropped successfully';
        ELSE
            RAISE NOTICE 'No foreign key constraint found on user_id column';
        END IF;
        
        -- Convert user_id column to TEXT
        RAISE NOTICE 'Converting user_id column to TEXT type...';
        ALTER TABLE job_descriptions ALTER COLUMN user_id TYPE TEXT;
        RAISE NOTICE 'Successfully converted user_id column to TEXT';
        
        -- Show what we accomplished
        RAISE NOTICE '=== MIGRATION COMPLETED ===';
        RAISE NOTICE 'The user_id column now supports both:';
        RAISE NOTICE '- UUID strings for authenticated users';
        RAISE NOTICE '- Session strings for anonymous users';
        RAISE NOTICE 'Foreign key constraint removed (app handles validation)';
        
    ELSE
        RAISE NOTICE 'user_id column is already TEXT type - no conversion needed';
    END IF;
    
END $$;

-- Verify the final state
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'job_descriptions' AND column_name = 'user_id';

-- Show any remaining constraints
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'job_descriptions' 
  AND kcu.column_name = 'user_id';