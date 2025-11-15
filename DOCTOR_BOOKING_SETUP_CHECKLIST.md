# 🚀 Doctor Booking System - Setup Checklist

## Phase 1: Database Setup ✅

### Step 1: Execute SQL in Supabase
- [ ] Go to Supabase Dashboard
- [ ] Click "SQL Editor"
- [ ] Click "New Query"
- [ ] Open file: `SUPABASE_DOCTOR_BOOKING_SETUP.sql`
- [ ] Copy ALL content
- [ ] Paste into Supabase SQL Editor
- [ ] Click "Run" (or Ctrl+Enter)
- [ ] Verify: No errors shown
- [ ] Verify: 3 new tables created (doctors, doctor_slots, booking_requests)

### Step 2: Create Doctor User Accounts
- [ ] Go to Supabase Authentication → Users
- [ ] Create at least 1 test doctor account
  - Email: doctor1@example.com
  - Password: any secure password
- [ ] Create at least 1 test patient account
  - Email: patient1@example.com
  - Password: any secure password

### Step 3: Add Doctor Metadata
- [ ] In Supabase, go to Authentication → Users
- [ ] Click on the doctor user
- [ ] Scroll to "Metadata" section
- [ ] Click "Edit"
- [ ] Paste this JSON:
  ```json
  {
    "role": "doctor"
  }
  ```
- [ ] Save
- [ ] Repeat for all doctor users

### Step 4: Get Doctor User IDs
- [ ] Still in Users list, copy the UUID of the doctor user(s)
- [ ] Example: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`
- [ ] Keep this handy for next step

### Step 5: Add Doctors to Database
- [ ] In Supabase SQL Editor → New Query
- [ ] Paste this (replace YOUR_DOCTOR_USER_ID):

```sql
INSERT INTO doctors (user_id, name, specialty, clinic_name, phone, address, latitude, longitude, bio, abha_linked, rating)
VALUES
  (
    'YOUR_DOCTOR_USER_ID',
    'Dr. Sarah Johnson',
    'General Physician',
    'FeverEase Health Clinic',
    '+91-9876543210',
    'No 394, Shubash Nagar TC Palaya, Bengaluru, Karnataka 560049',
    12.9716,
    77.6412,
    '15+ years of clinical experience in general medicine and patient care.',
    true,
    4.8
  );
```

- [ ] Click "Run"
- [ ] Verify: 1 row inserted

### Step 6: Add Available Slots
- [ ] Get the doctor ID from the doctors table
  - Run: `SELECT id FROM doctors LIMIT 1;`
  - Copy the UUID
- [ ] In SQL Editor → New Query
- [ ] Paste this (replace YOUR_DOCTOR_ID):

```sql
INSERT INTO doctor_slots (doctor_id, slot_datetime, is_available)
VALUES
  ('YOUR_DOCTOR_ID', '2025-11-16 09:00:00', true),
  ('YOUR_DOCTOR_ID', '2025-11-16 10:30:00', true),
  ('YOUR_DOCTOR_ID', '2025-11-16 14:00:00', true),
  ('YOUR_DOCTOR_ID', '2025-11-17 09:00:00', true),
  ('YOUR_DOCTOR_ID', '2025-11-17 15:30:00', true),
  ('YOUR_DOCTOR_ID', '2025-11-18 10:00:00', true),
  ('YOUR_DOCTOR_ID', '2025-11-18 16:00:00', true);
```

- [ ] Click "Run"
- [ ] Verify: 7 rows inserted

---

## Phase 2: React Code Update ✅

### Step 1: Check New Component Files
- [ ] New file exists: `src/components/PatientDoctorsPage_NEW.tsx` ✅
- [ ] New file exists: `src/components/DoctorRequestsPage_NEW.tsx` ✅

### Step 2: Update Routes
- [ ] Find your main routing file (App.tsx, or your router config)
- [ ] Locate the import for old pages:
  ```tsx
  import PatientDoctorsPage from "@/components/PatientDoctorsPage";
  import DoctorRequestsPage from "@/components/DoctorRequestsPage";
  ```
- [ ] Replace with:
  ```tsx
  import { PatientDoctorsPage } from "@/components/PatientDoctorsPage_NEW";
  import { DoctorRequestsPage } from "@/components/DoctorRequestsPage_NEW";
  ```
- [ ] Find route definitions (likely in router or same file)
- [ ] Verify routes point to new components:
  ```tsx
  <Route path="/find-doctors" element={<PatientDoctorsPage />} />
  <Route path="/requests" element={<DoctorRequestsPage />} />
  ```
- [ ] Make sure `/doctor` route also works (for "Consult Doctor" button)

### Step 3: Verify Component Imports
- [ ] Open `PatientDoctorsPage_NEW.tsx`
- [ ] Verify no errors (red underlines)
- [ ] Open `DoctorRequestsPage_NEW.tsx`
- [ ] Verify no errors

### Step 4: Check for Syntax Errors
- [ ] Run: `npm run dev` or your dev server
- [ ] Check browser console for errors
- [ ] Check terminal for build errors
- [ ] Should say: "Compiled successfully" or similar

---

## Phase 3: Manual Testing ✅

### Test 1: Patient Searches for Doctors
- [ ] Log in as patient user
- [ ] Navigate to "Find Doctors" page
- [ ] Should see the doctor you added
- [ ] Click on doctor name
- [ ] Should see doctor details (bio, contact, rating)
- [ ] Should see available slots listed

### Test 2: Patient Books an Appointment
- [ ] Still as patient, on doctor details
- [ ] Click on a time slot
- [ ] Button should highlight (show selected state)
- [ ] Click "Confirm Booking"
- [ ] Should see success toast message
- [ ] Navigate to "My Bookings" page
- [ ] Should see the booking with status "pending"

### Test 3: Doctor Sees Booking Request
- [ ] Log out as patient
- [ ] Log in as doctor user
- [ ] Navigate to "Appointment Requests" page
- [ ] Should see the patient's booking request
- [ ] Should show: Patient email, appointment time, reason for visit

### Test 4: Doctor Accepts Appointment
- [ ] As doctor, on the pending request
- [ ] Click "Accept" button
- [ ] Should see success toast
- [ ] Status should change to "accepted" (green badge)
- [ ] Log out and log back in as patient
- [ ] Check "My Bookings"
- [ ] Status should show "accepted"

### Test 5: Doctor Rejects Appointment
- [ ] Create another booking as patient
- [ ] As doctor, click "Reject" button
- [ ] Status should change to "rejected" (red badge)
- [ ] As patient, status should show "rejected"

### Test 6: Search and Filter
- [ ] Add another doctor (optional, for testing filters)
- [ ] As patient, on Find Doctors page
- [ ] Try searching by doctor name - should filter results
- [ ] Try filtering by specialty - should work
- [ ] Clear filters - should show all doctors

### Test 7: Real-time Updates
- [ ] Have two browser windows/tabs open
- [ ] Left: Patient logged in, on My Bookings
- [ ] Right: Doctor logged in, on Appointment Requests
- [ ] In right window (doctor), click Accept
- [ ] In left window (patient), should see status change without refresh
  - If not instant, refresh the page - it should be updated

---

## Phase 4: Fix Common Issues ✅

### Issue: "No doctors showing"
- [ ] Verify doctors table has data: `SELECT * FROM doctors;`
- [ ] Check if you're logged in
- [ ] Check browser console for errors
- [ ] Verify is_available = true for the doctor

### Issue: "No slots showing"
- [ ] Check doctor_slots table: `SELECT * FROM doctor_slots WHERE doctor_id = 'ID';`
- [ ] Make sure slot_datetime is in the future
- [ ] Make sure is_available = true

### Issue: "Can't see bookings as doctor"
- [ ] Make sure user has `"role": "doctor"` in metadata
- [ ] Verify booking_requests table has data
- [ ] Check if status is 'pending' (other statuses might not show in pending filter)

### Issue: "Component not loading"
- [ ] Check browser console for errors
- [ ] Verify route is correct
- [ ] Check that you updated the imports
- [ ] Restart dev server if necessary

### Issue: "RLS Policy Denied"
- [ ] Check Supabase logs for which policy failed
- [ ] Make sure you're logged in with right user
- [ ] For doctors, make sure metadata has `"role": "doctor"`
- [ ] For patients, just need to be logged in as patient user

---

## Phase 5: Cleanup (After Testing)

### When Everything Works:
- [ ] Decide: Keep the old files or delete them?
  - Option A: Delete old PatientDoctorsPage.tsx and DoctorRequestsPage.tsx
  - Option B: Keep them as backup
- [ ] Rename _NEW files (optional):
  - PatientDoctorsPage_NEW.tsx → PatientDoctorsPage.tsx
  - DoctorRequestsPage_NEW.tsx → DoctorRequestsPage.tsx
  - Update imports accordingly
- [ ] Remove sample data (optional):
  - Delete doctor records from testing
  - Delete booking requests from testing
  - Keep the database structure

---

## Final Verification Checklist

- [ ] All 3 database tables created and have data
- [ ] Doctor users have role: "doctor" metadata
- [ ] Components load without errors
- [ ] Patient can search and view doctors
- [ ] Patient can book an appointment
- [ ] Booking shows in "My Bookings" with "pending" status
- [ ] Doctor can see the booking request
- [ ] Doctor can accept the booking
- [ ] Patient sees status change to "accepted"
- [ ] Doctor can reject a booking
- [ ] Patient sees status change to "rejected"
- [ ] Real-time updates work (or at least update on refresh)
- [ ] Search and filter features work
- [ ] No errors in browser console
- [ ] No errors in terminal

---

## 🎉 You're Done!

Once all checkboxes above are checked, your doctor booking system is fully functional and ready for production!

### Next Steps (Optional):
1. Add more doctors to the database
2. Create a doctor dashboard for managing slots
3. Add appointment confirmation emails
4. Add payment integration
5. Add reviews/ratings system
6. Add call/video consultation features

---

## 📞 Quick Reference

### Common SQL Queries:

**View all doctors:**
```sql
SELECT id, name, specialty, clinic_name, is_available FROM doctors;
```

**View available slots:**
```sql
SELECT * FROM doctor_slots WHERE is_available = true ORDER BY slot_datetime;
```

**View pending requests:**
```sql
SELECT * FROM booking_requests WHERE status = 'pending';
```

**View all bookings for a patient:**
```sql
SELECT * FROM booking_requests WHERE patient_id = 'PATIENT_UUID';
```

**Update doctor status:**
```sql
UPDATE doctors SET is_available = false WHERE id = 'DOCTOR_UUID';
```

---

Good luck! 🚀
