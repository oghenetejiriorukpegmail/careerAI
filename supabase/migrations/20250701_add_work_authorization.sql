-- Add work authorization to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS work_authorization TEXT;

-- Common values: 'US Citizen', 'Green Card', 'H1B', 'H4 EAD', 'F1 OPT', 'F1 CPT', 'TN', 'L1', 'L2 EAD', 'Other'