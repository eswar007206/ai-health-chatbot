-- ============================================================================
-- Migration: Add User Profiles and Enhanced Authentication
-- Purpose: Support role-based authentication (Patient/Doctor) with additional fields
-- ============================================================================

-- Create user_profiles table to store role and additional user information
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'doctor', 'admin')),
  phone TEXT,
  abha_id TEXT, -- For patients
  aadhaar_no TEXT, -- For patients
  abdm_id TEXT, -- For doctors
  hpr_id TEXT, -- For doctors (required for doctors)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  user_phone TEXT;
  user_abha_id TEXT;
  user_aadhaar_no TEXT;
  user_abdm_id TEXT;
  user_hpr_id TEXT;
BEGIN
  -- Extract role and additional data from user metadata
  user_role := COALESCE(
    NEW.raw_user_meta_data->>'role',
    NEW.raw_user_meta_data->>'user_role',
    'patient'
  );
  
  user_phone := NEW.raw_user_meta_data->>'phone';
  user_abha_id := NEW.raw_user_meta_data->>'abha_id';
  user_aadhaar_no := NEW.raw_user_meta_data->>'aadhaar_no';
  user_abdm_id := NEW.raw_user_meta_data->>'abdm_id';
  user_hpr_id := NEW.raw_user_meta_data->>'hpr_id';
  
  -- Insert profile
  INSERT INTO public.user_profiles (
    id,
    role,
    phone,
    abha_id,
    aadhaar_no,
    abdm_id,
    hpr_id
  ) VALUES (
    NEW.id,
    user_role,
    user_phone,
    user_abha_id,
    user_aadhaar_no,
    user_abdm_id,
    user_hpr_id
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to automatically create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create function to update profile when user metadata changes
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update profile if metadata changed
  IF (OLD.raw_user_meta_data IS DISTINCT FROM NEW.raw_user_meta_data) THEN
    UPDATE public.user_profiles
    SET
      role = COALESCE(
        NEW.raw_user_meta_data->>'role',
        NEW.raw_user_meta_data->>'user_role',
        role
      ),
      phone = COALESCE(NEW.raw_user_meta_data->>'phone', phone),
      abha_id = COALESCE(NEW.raw_user_meta_data->>'abha_id', abha_id),
      aadhaar_no = COALESCE(NEW.raw_user_meta_data->>'aadhaar_no', aadhaar_no),
      abdm_id = COALESCE(NEW.raw_user_meta_data->>'abdm_id', abdm_id),
      hpr_id = COALESCE(NEW.raw_user_meta_data->>'hpr_id', hpr_id),
      updated_at = now()
    WHERE id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to update profile on user metadata update
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_update();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_hpr_id ON public.user_profiles(hpr_id) WHERE hpr_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_user_profiles_abha_id ON public.user_profiles(abha_id) WHERE abha_id IS NOT NULL;

-- Create helper function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT role FROM public.user_profiles WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Backfill existing users (create profiles for users that already exist)
INSERT INTO public.user_profiles (id, role, created_at, updated_at)
SELECT 
  id,
  COALESCE(
    raw_user_meta_data->>'role',
    raw_user_meta_data->>'user_role',
    'patient'
  )::TEXT,
  created_at,
  updated_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.user_profiles)
ON CONFLICT (id) DO NOTHING;

