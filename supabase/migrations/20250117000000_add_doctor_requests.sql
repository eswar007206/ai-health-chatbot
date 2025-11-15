-- ============================================================================
-- Migration: Add Doctor Requests/Bookings System
-- Purpose: Enable patients to book doctors and doctors to accept/reject requests
-- ============================================================================

-- Create doctors table to map doctor entries to user accounts
CREATE TABLE IF NOT EXISTS public.doctors (
  id TEXT NOT NULL PRIMARY KEY, -- Doctor entry ID (e.g., "doc-001")
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  clinic_name TEXT,
  specialty TEXT,
  phone TEXT,
  address TEXT,
  lat NUMERIC,
  lon NUMERIC,
  rating NUMERIC DEFAULT 0,
  abha_linked BOOLEAN DEFAULT false,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create doctor_requests table
CREATE TABLE IF NOT EXISTS public.doctor_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doctor_entry_id TEXT REFERENCES public.doctors(id) ON DELETE SET NULL,
  patient_name TEXT NOT NULL,
  patient_email TEXT,
  patient_phone TEXT,
  patient_age INTEGER,
  patient_gender TEXT,
  abha_id TEXT,
  symptoms_summary TEXT,
  appointment_date TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_requests ENABLE ROW LEVEL SECURITY;

-- Doctors table policies (public read, admin write)
CREATE POLICY "Anyone can view doctors"
  ON public.doctors FOR SELECT
  USING (true);

CREATE POLICY "Doctors can update their own entry"
  ON public.doctors FOR UPDATE
  USING (auth.uid() = user_id);

-- Create policies for doctor_requests
-- Patients can view their own requests
CREATE POLICY "Patients can view their own requests"
  ON public.doctor_requests FOR SELECT
  USING (auth.uid() = patient_id);

-- Patients can create requests
CREATE POLICY "Patients can create requests"
  ON public.doctor_requests FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

-- Doctors can view requests assigned to them
CREATE POLICY "Doctors can view their requests"
  ON public.doctor_requests FOR SELECT
  USING (auth.uid() = doctor_id);

-- Doctors can update requests (accept/reject)
CREATE POLICY "Doctors can update their requests"
  ON public.doctor_requests FOR UPDATE
  USING (auth.uid() = doctor_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON public.doctors(user_id);
CREATE INDEX IF NOT EXISTS idx_doctor_requests_patient_id ON public.doctor_requests(patient_id);
CREATE INDEX IF NOT EXISTS idx_doctor_requests_doctor_id ON public.doctor_requests(doctor_id);
CREATE INDEX IF NOT EXISTS idx_doctor_requests_status ON public.doctor_requests(status);
CREATE INDEX IF NOT EXISTS idx_doctor_requests_created_at ON public.doctor_requests(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_doctor_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.status != OLD.status THEN
    NEW.responded_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_doctor_requests_updated_at ON public.doctor_requests;
CREATE TRIGGER update_doctor_requests_updated_at
  BEFORE UPDATE ON public.doctor_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_doctor_requests_updated_at();

