# Supabase Setup Guide for Enhanced Authentication

This guide explains what you need to upload/remove in Supabase for the new role-based authentication system to work properly.

## 📋 What You Need to Do

### ✅ **UPLOAD (New Migration)**

1. **Upload the new migration file:**
   - File: `supabase/migrations/20250116000000_add_user_profiles_and_auth.sql`
   - This migration creates:
     - `user_profiles` table for storing role and additional user data
     - Automatic profile creation on user signup
     - RLS policies for user profiles
     - Helper functions for role management

### 🔧 **How to Upload the Migration**

#### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the entire contents of `20250116000000_add_user_profiles_and_auth.sql`
5. Click **Run** to execute the migration

#### Option 2: Using Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db push
```

### 📊 **What the Migration Creates**

#### 1. **user_profiles Table**
Stores additional user information:
- `id` (UUID, references auth.users)
- `role` (patient/doctor/admin)
- `phone` (optional)
- `abha_id` (for patients)
- `aadhaar_no` (for patients)
- `abdm_id` (for doctors)
- `hpr_id` (for doctors, required)
- `created_at`, `updated_at` timestamps

#### 2. **Automatic Profile Creation**
- Trigger automatically creates a profile when a new user signs up
- Extracts role and additional data from user metadata
- No manual intervention needed

#### 3. **Row Level Security (RLS) Policies**
- Users can only view/update their own profile
- Secure by default

#### 4. **Backfill Existing Users**
- Automatically creates profiles for existing users
- Uses default role "patient" if no role is specified

### ❌ **What You DON'T Need to Remove**

**Keep these existing migrations:**
- ✅ `20251109091703_81b48874-95bf-4b99-8f3e-383c6e84ea60.sql` (conversations & messages tables)
- ✅ `20251109091735_163c93b6-271d-4a04-9ae6-e0f8f9116b52.sql` (function fix)

**The new migration is additive and won't conflict with existing tables.**

### 🔍 **Verification Steps**

After uploading the migration, verify it worked:

**Quick Verification (Run in SQL Editor):**
1. Open Supabase SQL Editor
2. Run the verification script: `supabase/verify_setup.sql`
3. All checks should show ✅

**Manual Verification:**

1. **Check if table exists:**
   ```sql
   SELECT * FROM public.user_profiles LIMIT 1;
   ```

2. **Check if trigger exists:**
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```

3. **Test user signup:**
   - Sign up a new user through your app
   - Check if a profile was automatically created:
     ```sql
     SELECT * FROM public.user_profiles WHERE id = '<user_id>';
     ```

### 🎯 **What Happens After Migration**

1. **New User Signup:**
   - User signs up with role (patient/doctor)
   - Profile automatically created with role and additional fields
   - Role stored in both `auth.users.raw_user_meta_data` and `user_profiles.role`

2. **Existing Users:**
   - Profiles automatically created with default role "patient"
   - Can be updated later through the app

3. **Role Detection:**
   - App checks `user_profiles.role` first
   - Falls back to `auth.users.raw_user_meta_data` if profile doesn't exist
   - Falls back to email domain detection (@hpr.abdm → doctor)
   - Defaults to "patient"

### 🔐 **Security Notes**

- All RLS policies are in place
- Users can only access their own profile
- Admin access can be added later if needed
- Sensitive data (Aadhaar, HPR ID) is stored securely

### 📝 **Optional: Additional Tables (Future)**

If you want to add doctor-patient relationships or appointment booking, you can create additional migrations later. The current setup supports:
- ✅ Role-based authentication
- ✅ Patient signup with ABHA/Aadhaar
- ✅ Doctor signup with HPR ID
- ✅ Role-based page access

### 🐛 **Troubleshooting**

**Issue: Profile not created on signup**
- Check if trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`
- Check trigger function: `SELECT * FROM pg_proc WHERE proname = 'handle_new_user';`
- Verify RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user_profiles';`

**Issue: Cannot access profile**
- Verify RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'user_profiles';`
- Check if user is authenticated: `SELECT auth.uid();`

**Issue: Role not detected**
- Check user metadata: `SELECT raw_user_meta_data FROM auth.users WHERE id = '<user_id>';`
- Check profile: `SELECT * FROM public.user_profiles WHERE id = '<user_id>';`

### ✅ **Summary**

**What to Upload:**
- ✅ `supabase/migrations/20250116000000_add_user_profiles_and_auth.sql`

**What to Keep:**
- ✅ All existing migrations
- ✅ All existing tables (conversations, messages)

**What to Remove:**
- ❌ Nothing! The migration is additive.

After running the migration, your authentication system will support:
- Role-based signup (Patient/Doctor)
- Additional fields (phone, ABHA ID, HPR ID, etc.)
- Automatic profile creation
- Secure role-based access control

