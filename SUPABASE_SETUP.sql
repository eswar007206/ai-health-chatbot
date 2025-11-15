-- ============================================================================
-- DOCTOR BOOKING SYSTEM - SUPABASE SQL SETUP
-- ============================================================================
-- Copy and paste these SQL commands into Supabase SQL Editor
-- Replace [DOCTOR_USER_ID_X] with actual Supabase auth user IDs
-- ============================================================================

-- ============================================================================
-- STEP 1: Find Your Doctor User IDs
-- ============================================================================
-- Run this first to get the UUIDs:
SELECT id, email FROM auth.users WHERE email LIKE '%@%' LIMIT 20;
-- Copy the ID column values for your doctor accounts
-- ============================================================================

-- ============================================================================
-- STEP 2: Insert Test Doctor Data
-- ============================================================================
-- Replace [DOCTOR_USER_ID_1], [DOCTOR_USER_ID_2], etc. with actual UUIDs
-- You can create more by copying this pattern

INSERT INTO public.doctors (id, user_id, name, clinic_name, specialty, phone, address, lat, lon, rating, abha_linked, bio)
VALUES 
  (
    'doc-001',
    '[DOCTOR_USER_ID_1]',
    'Dr. Sarah Johnson',
    'FeverEase Health Clinic',
    'General Physician',
    '+91-9876543210',
    'No 394, Shubash Nagar TC Palaya Main Road, Bengaluru, Karnataka 560049',
    12.9716,
    77.6412,
    4.8,
    true,
    '15+ years of clinical experience in general medicine and patient care.'
  ),
  (
    'doc-002',
    '[DOCTOR_USER_ID_2]',
    'Dr. Amit Patel',
    'Cardiac Care Center',
    'Cardiologist',
    '+91-9876543211',
    'Cardiac Care Center, 5th Cross Road, Indiranagar, Bengaluru',
    12.9735,
    77.6442,
    4.6,
    false,
    'Specialist in cardiac care and hypertension management.'
  ),
  (
    'doc-003',
    '[DOCTOR_USER_ID_3]',
    'Dr. Priya Sharma',
    'Women''s Health Center',
    'Gynecologist',
    '+91-9876543212',
    'Women''s Health Center, MG Road, Bengaluru, Karnataka',
    12.9629,
    77.5985,
    4.9,
    true,
    'Expert in women''s health, pregnancy care, and reproductive medicine.'
  ),
  (
    'doc-004',
    '[DOCTOR_USER_ID_4]',
    'Dr. Rajesh Verma',
    'Skin Care Clinic',
    'Dermatologist',
    '+91-9876543214',
    'Skin Care Clinic, Brigade Road, Bengaluru',
    12.9627,
    77.5903,
    4.5,
    false,
    'Specialized in dermatology and cosmetic skin treatments.'
  ),
  (
    'doc-005',
    '[DOCTOR_USER_ID_5]',
    'Dr. Meera Singh',
    'Neuro Care Center',
    'Neurologist',
    '+91-9876543215',
    'Neuro Care Center, Koramangala, Bengaluru',
    12.9352,
    77.6245,
    4.8,
    true,
    'Expert neurologist with 12+ years in neurology and migraine management.'
  );

-- Verify doctors were inserted:
SELECT id, name, specialty, rating FROM public.doctors;

-- ============================================================================
-- STEP 3: Verify Row Level Security Policies
-- ============================================================================
-- Check if policies exist:
SELECT schemaname, tablename, policyname, permissive
FROM pg_policies
WHERE tablename = 'doctor_requests'
ORDER BY policyname;

-- If missing, create them:
DROP POLICY IF EXISTS "Patients can view their own requests" ON public.doctor_requests;
DROP POLICY IF EXISTS "Patients can create requests" ON public.doctor_requests;
DROP POLICY IF EXISTS "Doctors can view their requests" ON public.doctor_requests;
DROP POLICY IF EXISTS "Doctors can update their requests" ON public.doctor_requests;

CREATE POLICY "Patients can view their own requests"
  ON public.doctor_requests FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Patients can create requests"
  ON public.doctor_requests FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Doctors can view their requests"
  ON public.doctor_requests FOR SELECT
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can update their requests"
  ON public.doctor_requests FOR UPDATE
  USING (auth.uid() = doctor_id);

-- ============================================================================
-- STEP 4: (GUI) Enable Realtime Publishing
-- ============================================================================
-- Go to Supabase Dashboard > Database > Publications
-- Click "publication_supabase_realtime"
-- Add table "doctor_requests"
-- Enable: INSERT, UPDATE, DELETE
-- ============================================================================

-- ============================================================================
-- STEP 5: Test the Setup
-- ============================================================================
-- Get patient and doctor IDs:
SELECT id, email FROM auth.users LIMIT 10;

-- Create a test request (replace with real UUIDs):
INSERT INTO public.doctor_requests (
  patient_id,
  doctor_id,
  doctor_entry_id,
  patient_name,
  patient_email,
  patient_phone,
  abha_id,
  symptoms_summary,
  appointment_date,
  status
) VALUES (
  '[PATIENT_USER_ID]',
  '[DOCTOR_USER_ID_1]',
  'doc-001',
  'Test Patient',
  'patient@example.com',
  '+91-9876543200',
  'ABHA-TEST-1234-5678',
  'Testing the doctor booking system',
  NOW() + INTERVAL '2 days',
  'pending'
);

-- View all requests:
SELECT 
  id,
  patient_name,
  status,
  symptoms_summary,
  appointment_date,
  created_at
FROM public.doctor_requests
ORDER BY created_at DESC;

-- ============================================================================
-- STEP 6: Update User Profiles (Optional)
-- ============================================================================
-- Add doctor flags to user profiles if not already done:

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS is_doctor BOOLEAN DEFAULT false;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS hpr_id TEXT;

ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS specialty TEXT;

-- Mark doctor users as doctors:
UPDATE public.user_profiles
SET is_doctor = true
WHERE id IN (
  SELECT user_id FROM public.doctors
);

-- ============================================================================
-- USEFUL QUERIES
-- ============================================================================

-- Get all pending requests for a specific doctor:
SELECT 
  patient_name,
  symptoms_summary,
  appointment_date,
  created_at
FROM public.doctor_requests
WHERE doctor_id = '[DOCTOR_USER_ID]' AND status = 'pending'
ORDER BY created_at DESC;

-- Get all requests for a specific patient:
SELECT 
  id,
  status,
  symptoms_summary,
  appointment_date,
  rejection_reason,
  responded_at
FROM public.doctor_requests
WHERE patient_id = '[PATIENT_USER_ID]'
ORDER BY created_at DESC;

-- Get doctor information:
SELECT * FROM public.doctors WHERE id = 'doc-001';

-- Count requests by status:
SELECT status, COUNT(*) as count
FROM public.doctor_requests
GROUP BY status;

-- Get recent requests (last 7 days):
SELECT patient_name, status, created_at
FROM public.doctor_requests
WHERE created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;

-- ============================================================================
-- CLEANUP (If needed)
-- ============================================================================

-- Delete all test doctor requests:
-- DELETE FROM public.doctor_requests WHERE doctor_entry_id IN ('doc-001', 'doc-002');

-- Delete all test doctors:
-- DELETE FROM public.doctors WHERE id IN ('doc-001', 'doc-002', 'doc-003', 'doc-004', 'doc-005');

-- ============================================================================
-- END OF SETUP
-- ============================================================================

