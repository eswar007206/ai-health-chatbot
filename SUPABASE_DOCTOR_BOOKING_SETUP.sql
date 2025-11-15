-- ============================================================================
-- SUPABASE DATABASE SETUP FOR DOCTOR BOOKING SYSTEM
-- Copy and paste ALL of this into your Supabase SQL Editor
-- ============================================================================

-- 1. CREATE DOCTORS TABLE
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  clinic_name TEXT,
  phone TEXT NOT NULL,
  email TEXT,
  bio TEXT,
  rating NUMERIC DEFAULT 4.5,
  image_url TEXT,
  address TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  abha_linked BOOLEAN DEFAULT FALSE,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. CREATE AVAILABLE SLOTS TABLE
CREATE TABLE IF NOT EXISTS doctor_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  slot_datetime TIMESTAMP NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(doctor_id, slot_datetime)
);

-- 3. CREATE BOOKING/APPOINTMENT REQUESTS TABLE
CREATE TABLE IF NOT EXISTS booking_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES doctor_slots(id) ON DELETE CASCADE,
  slot_datetime TIMESTAMP NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, accepted, rejected, completed, cancelled
  reason_for_visit TEXT,
  patient_notes TEXT,
  doctor_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. CREATE INDEXES FOR BETTER PERFORMANCE
CREATE INDEX idx_doctors_user_id ON doctors(user_id);
CREATE INDEX idx_doctors_latitude_longitude ON doctors(latitude, longitude);
CREATE INDEX idx_doctor_slots_doctor_id ON doctor_slots(doctor_id);
CREATE INDEX idx_doctor_slots_datetime ON doctor_slots(slot_datetime);
CREATE INDEX idx_booking_requests_doctor_id ON booking_requests(doctor_id);
CREATE INDEX idx_booking_requests_patient_id ON booking_requests(patient_id);
CREATE INDEX idx_booking_requests_status ON booking_requests(status);

-- 5. ENABLE ROW LEVEL SECURITY (RLS)
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_requests ENABLE ROW LEVEL SECURITY;

-- 6. CREATE RLS POLICIES FOR DOCTORS TABLE
-- Doctors can view their own profile
CREATE POLICY "Doctors can view own profile" ON doctors
  FOR SELECT
  USING (auth.uid() = user_id);

-- Everyone can view all doctors (for patient searching)
CREATE POLICY "Anyone can view all doctors" ON doctors
  FOR SELECT
  USING (true);

-- Doctors can create their own profile
CREATE POLICY "Doctors can create own profile" ON doctors
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Doctors can update their own profile
CREATE POLICY "Doctors can update own profile" ON doctors
  FOR UPDATE
  USING (auth.uid() = user_id);

-- 7. CREATE RLS POLICIES FOR DOCTOR SLOTS TABLE
-- Doctors can view their own slots
CREATE POLICY "Doctors can view own slots" ON doctor_slots
  FOR SELECT
  USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

-- Everyone can view available slots
CREATE POLICY "Anyone can view available slots" ON doctor_slots
  FOR SELECT
  USING (is_available = true);

-- Doctors can create slots for themselves
CREATE POLICY "Doctors can create slots" ON doctor_slots
  FOR INSERT
  WITH CHECK (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

-- Doctors can update their own slots
CREATE POLICY "Doctors can update own slots" ON doctor_slots
  FOR UPDATE
  USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

-- 8. CREATE RLS POLICIES FOR BOOKING REQUESTS TABLE
-- Patients can view their own booking requests
CREATE POLICY "Patients can view own bookings" ON booking_requests
  FOR SELECT
  USING (auth.uid() = patient_id);

-- Doctors can view booking requests for their slots
CREATE POLICY "Doctors can view booking requests" ON booking_requests
  FOR SELECT
  USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

-- Patients can create booking requests
CREATE POLICY "Patients can create booking requests" ON booking_requests
  FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

-- Doctors can update booking request status
CREATE POLICY "Doctors can update booking status" ON booking_requests
  FOR UPDATE
  USING (doctor_id IN (SELECT id FROM doctors WHERE user_id = auth.uid()));

-- 9. CREATE FUNCTION TO UPDATE updated_at TIMESTAMP
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. CREATE TRIGGERS FOR updated_at
CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_doctor_slots_updated_at BEFORE UPDATE ON doctor_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_booking_requests_updated_at BEFORE UPDATE ON booking_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. SAMPLE DATA (Optional - for testing)
-- Add this data AFTER you've set up everything above
-- These will be sample doctors for testing

-- Insert sample doctors:
-- INSERT INTO doctors (user_id, name, specialty, clinic_name, phone, address, latitude, longitude, bio, abha_linked)
-- VALUES 
--   ('your-doctor-user-id-1', 'Dr. Sarah Johnson', 'General Physician', 'FeverEase Health Clinic', '+91-9876543210', 'No 394, Shubash Nagar TC Palaya Main Road, Bengaluru, Karnataka 560049', 12.9716, 77.6412, '15+ years of clinical experience', true),
--   ('your-doctor-user-id-2', 'Dr. Vikram Kapoor', 'Cardiologist', 'Apollo Health Clinic', '+91-9876543211', 'Apollo Health Center, Banjara Hills, Hyderabad Road, Bengaluru', 12.9773, 77.5896, 'Expert in cardiology with modern diagnostic facilities', false);

-- ============================================================================
-- IMPORTANT NOTES:
-- ============================================================================
-- 1. Replace 'your-doctor-user-id-1' and 'your-doctor-user-id-2' with actual user IDs from your auth.users table
-- 2. Make sure each doctor has a corresponding auth user account
-- 3. The RLS policies ensure data security - patients see only their bookings, doctors see only their requests
-- 4. Coordinates are in decimal format (latitude, longitude) for Bengaluru, India
-- 5. Status values: 'pending' (awaiting doctor response), 'accepted' (doctor approved), 'rejected' (doctor declined), 'completed' (appointment done), 'cancelled' (patient cancelled)

