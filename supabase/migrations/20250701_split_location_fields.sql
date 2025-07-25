-- Split location into city, state, and country fields
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS country TEXT;

-- Keep the original location column for backward compatibility
-- It can be removed in a future migration after data migration