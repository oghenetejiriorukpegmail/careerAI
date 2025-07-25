-- Migration: Add profile location and work authorization fields
-- Date: 2025-01-01
-- Description: Splits location into city, state, country and adds work authorization

-- Add work authorization column
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS work_authorization TEXT;

-- Add location detail columns  
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS country TEXT;

-- Add comments to document the columns
COMMENT ON COLUMN profiles.work_authorization IS 'User work authorization status (US Citizen, Green Card, H1B, etc.)';
COMMENT ON COLUMN profiles.city IS 'User city for location-based job matching';
COMMENT ON COLUMN profiles.state IS 'User state/province for location-based job matching';
COMMENT ON COLUMN profiles.country IS 'User country for location-based job matching';