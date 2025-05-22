-- Create users table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE,
  full_name TEXT,
  phone TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create resumes table
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  extracted_text TEXT,
  processing_status TEXT DEFAULT 'pending',
  ai_provider TEXT,
  ai_model TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  parsed_data JSONB -- Parsed resume data by AI
);

-- Create job_descriptions table
CREATE TABLE IF NOT EXISTS job_descriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL, -- Using TEXT to support both UUID and session IDs
  job_title TEXT,
  company_name TEXT,
  location TEXT,
  description TEXT NOT NULL,
  url TEXT,
  input_method TEXT NOT NULL DEFAULT 'manual', -- 'url', 'text_paste', 'manual'
  employment_type TEXT, -- 'Full-time', 'Part-time', 'Contract', 'Internship'
  salary_range TEXT,
  posted_date TIMESTAMP WITH TIME ZONE,
  application_deadline TIMESTAMP WITH TIME ZONE,
  processing_status TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  ai_provider TEXT,
  ai_model TEXT,
  match_score FLOAT, -- AI-calculated match score against user profile (0-100)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  parsed_data JSONB, -- Parsed job description data by AI
  raw_content TEXT -- Original scraped/pasted content for reference
);

-- Create linkedin_profiles table
CREATE TABLE IF NOT EXISTS linkedin_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  profile_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  parsed_data JSONB -- Parsed LinkedIn data by AI
);

-- Create generated_documents table
CREATE TABLE IF NOT EXISTS generated_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  job_description_id UUID REFERENCES job_descriptions(id),
  doc_type TEXT NOT NULL, -- 'resume' or 'cover_letter'
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create job_matches table
CREATE TABLE IF NOT EXISTS job_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  job_title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  location TEXT,
  job_url TEXT NOT NULL,
  description TEXT,
  source TEXT, -- 'indeed', 'linkedin', 'dice'
  matched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  relevance_score FLOAT -- Score from 0-1 showing match relevance
);

-- Create job_applications table
CREATE TABLE IF NOT EXISTS job_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) NOT NULL,
  job_match_id UUID REFERENCES job_matches(id),
  job_description_id UUID REFERENCES job_descriptions(id),
  resume_id UUID REFERENCES generated_documents(id),
  cover_letter_id UUID REFERENCES generated_documents(id),
  status TEXT NOT NULL DEFAULT 'to_apply', -- 'to_apply', 'applied', 'interviewing', 'offered', 'rejected'
  applied_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- RLS Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_descriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE linkedin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Create policies for users to access their own data
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE USING (auth.uid() = id);
  
CREATE POLICY "Users can view their own resumes" 
  ON resumes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own resumes" 
  ON resumes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own resumes" 
  ON resumes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own resumes" 
  ON resumes FOR DELETE USING (auth.uid() = user_id);

-- Repeat similar policies for other tables

-- Function to create a profile entry when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create user_settings table for storing AI configuration and user preferences
-- This table supports both authenticated users and session-based users
CREATE TABLE IF NOT EXISTS user_settings (
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