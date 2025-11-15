-- ============================================================================
-- Verification Script for Supabase Auth Setup
-- Run this in Supabase SQL Editor to verify everything is set up correctly
-- ============================================================================

-- 1. Check if user_profiles table exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles')
    THEN '✅ user_profiles table exists'
    ELSE '❌ user_profiles table NOT found'
  END AS table_check;

-- 2. Check table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 3. Check if triggers exist
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created')
    THEN '✅ on_auth_user_created trigger exists'
    ELSE '❌ on_auth_user_created trigger NOT found'
  END AS trigger_check;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_updated')
    THEN '✅ on_auth_user_updated trigger exists'
    ELSE '❌ on_auth_user_updated trigger NOT found'
  END AS trigger_update_check;

-- 4. Check if functions exist
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user')
    THEN '✅ handle_new_user function exists'
    ELSE '❌ handle_new_user function NOT found'
  END AS function_check;

SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_role')
    THEN '✅ get_user_role function exists'
    ELSE '❌ get_user_role function NOT found'
  END AS helper_function_check;

-- 5. Check RLS policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_profiles';

-- 6. Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity,
  CASE 
    WHEN rowsecurity THEN '✅ RLS enabled'
    ELSE '❌ RLS NOT enabled'
  END AS rls_status
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'user_profiles';

-- 7. Count existing profiles
SELECT 
  COUNT(*) as total_profiles,
  COUNT(CASE WHEN role = 'patient' THEN 1 END) as patient_count,
  COUNT(CASE WHEN role = 'doctor' THEN 1 END) as doctor_count,
  COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count
FROM public.user_profiles;

-- 8. Check for users without profiles (should be 0 after backfill)
SELECT 
  COUNT(*) as users_without_profiles
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.id
WHERE p.id IS NULL;

-- 9. Sample profile data (if any exists)
SELECT 
  id,
  role,
  phone,
  abha_id,
  hpr_id,
  created_at
FROM public.user_profiles
LIMIT 5;

