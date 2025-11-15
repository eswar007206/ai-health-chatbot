# Complete Doctor Booking & Appointment Workflow

## Overview
This document outlines the complete workflow for the integrated doctor booking system where patients can book appointments and doctors can accept/reject requests.

---

## System Architecture

### 1. Database Tables (Already Created)

#### `public.doctors` table
- **Purpose**: Maps doctor profiles to user accounts
- **Fields**:
  - `id` (TEXT, PRIMARY KEY) - Doctor entry ID (e.g., "doc-001")
  - `user_id` (UUID, FK) - Links to auth.users.id (doctor's account)
  - `name`, `clinic_name`, `specialty`, `phone`, `address`
  - `lat`, `lon` - Location coordinates
  - `rating`, `abha_linked`, `bio`
  - `created_at`, `updated_at`

#### `public.doctor_requests` table
- **Purpose**: Stores all appointment booking requests
- **Fields**:
  - `id` (UUID, PRIMARY KEY)
  - `patient_id` (UUID, FK) - Patient's auth.users.id
  - `doctor_id` (UUID, FK) - Doctor's auth.users.id
  - `doctor_entry_id` (TEXT, FK) - Links to doctors.id
  - `patient_name`, `patient_email`, `patient_phone`, `patient_age`, `patient_gender`, `abha_id`
  - `symptoms_summary` - Why patient is requesting appointment
  - `appointment_date` (TIMESTAMP) - Requested appointment slot
  - `status` (pending|accepted|rejected) - Request status
  - `rejection_reason` - If rejected, reason provided
  - `created_at`, `updated_at`, `responded_at`

#### `public.user_profiles` table (existing)
- Should include: `phone`, `abha_id`, `is_doctor` (boolean)

---

## User Types & Workflows

### Patient Workflow
1. **Browse Doctors** → Select Doctor → Choose Time Slot → Confirm Booking
2. **Backend**: Creates record in `doctor_requests` with status='pending'
3. **Real-time Update**: Patient receives notification when doctor accepts/rejects
4. **View Status**: Patient can see all their pending, accepted, and rejected requests

### Doctor Workflow
1. **View Requests Page** → See All Incoming Appointment Requests
2. **Accept/Reject**: Doctor reviews request and decides
3. **Backend**: Updates `doctor_requests` status and `responded_at` timestamp
4. **Real-time**: Patients are automatically notified

---

## Supabase Configuration Required

### Step 1: Add Missing Columns to user_profiles
```sql
-- Add these columns if they don't exist
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS is_doctor BOOLEAN DEFAULT false;
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS hpr_id TEXT; -- Health Professional Registration ID
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS specialty TEXT;
```

### Step 2: Insert/Update Doctors
```sql
-- When a doctor signs up, insert into doctors table
-- This should be done via trigger or application logic
-- Example for test data:
INSERT INTO public.doctors (id, user_id, name, clinic_name, specialty, phone, address, lat, lon, rating, bio)
VALUES 
  ('doc-001', '[DOCTOR_USER_ID_1]', 'Dr. Sarah Johnson', 'FeverEase Health Clinic', 'General Physician', '+91-9876543210', 'No 394, Shubash Nagar TC Palaya Main Road, Bengaluru', 12.9716, 77.6412, 4.8, '15+ years experience'),
  ('doc-002', '[DOCTOR_USER_ID_2]', 'Dr. Amit Patel', 'Cardiac Care Center', 'Cardiologist', '+91-9876543211', 'Indiranagar, Bengaluru', 12.9735, 77.6442, 4.6, 'Cardiac specialist');
```

### Step 3: Update Row Level Security (Already Done)
The migration file already has proper RLS policies:
- ✅ Patients can view/create/update their own requests
- ✅ Doctors can view requests assigned to them
- ✅ Doctors can accept/reject requests
- ✅ Automatic timestamps

### Step 4: Enable Real-time Subscriptions
In Supabase Dashboard:
1. Go to **Database** → **Publications**
2. Enable publication for `doctor_requests` table
3. Select events: `INSERT`, `UPDATE`, `DELETE`

---

## Frontend Implementation

### PatientDoctorsPage.tsx (PATIENT SIDE)
**Current State**: Has some dummy data
**Required Changes**:
1. Load real doctors from `public.doctors` table
2. Remove DUMMY_DOCTORS
3. Create real appointment slots from doctor availability
4. Handle booking request creation with real data
5. Show real-time status of requests

**Key Functions**:
```typescript
handleBookAppointment() 
  → Creates record in doctor_requests
  → Sends notification to doctor
  → Shows status in "My Requests" section

Real-time Subscription
  → Listens to doctor_requests changes
  → Notifies patient of accept/reject
  → Updates UI automatically
```

### DoctorRequestsPage.tsx (DOCTOR SIDE)
**Current State**: Uses DUMMY_REQUESTS
**Required Changes**:
1. Load real requests from `doctor_requests` where doctor_id = current_user.id
2. Remove DUMMY_REQUESTS
3. Show patient information with real data
4. Implement Accept/Reject with status updates
5. Show real-time updates

**Key Functions**:
```typescript
handleMarkAttended() / handleAcceptRequest()
  → Updates status to 'accepted'
  → Sets responded_at timestamp
  → Sends notification to patient

handleRejectRequest()
  → Updates status to 'rejected'
  → Sets rejection_reason
  → Sets responded_at timestamp
```

---

## Data Flow Diagram

```
PATIENT SIDE                      DATABASE                    DOCTOR SIDE
===========                       ========                    ===========

Browse Doctors ─────────→ SELECT * FROM doctors
Select Doctor ─────────→
Select Slot ──────────→
Book Appointment ─────→ INSERT INTO doctor_requests
                        (status='pending')
                              ↓
                        Real-time event
                              ↓
                        ← VIEW doctor_requests
                          (status='pending')
                        
Doctor Reviews ←────────────────→ DoctorRequestsPage
Doctor Accepts ────────→ UPDATE doctor_requests
                        (status='accepted')
                              ↓
                        Real-time event
                              ↓
                        ← RECEIVES NOTIFICATION
Patient Views Status ← Show green "Accepted"
```

---

## Real-time Notification Flow

### Patient Notifications
```typescript
supabase
  .channel('doctor_requests_changes')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'doctor_requests',
    filter: `patient_id=eq.${user.id}`
  }, (payload) => {
    if (payload.new.status === 'accepted') {
      showToast('Your request was accepted!');
    } else if (payload.new.status === 'rejected') {
      showToast('Your request was rejected');
    }
  })
  .subscribe();
```

### Doctor Notifications
```typescript
supabase
  .channel('doctor_requests_changes')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'doctor_requests',
    filter: `doctor_id=eq.${user.id}`
  }, (payload) => {
    showToast(`New appointment request from ${payload.new.patient_name}`);
    loadRequests(); // Refresh list
  })
  .subscribe();
```

---

## Migration Checklist

### In Supabase Console:

- [ ] **Step 1**: Verify `public.doctors` table exists with all columns
- [ ] **Step 2**: Verify `public.doctor_requests` table exists
- [ ] **Step 3**: Verify Row Level Security policies are enabled
- [ ] **Step 4**: Enable Realtime publication for `doctor_requests`
- [ ] **Step 5**: Insert test doctor data into `doctors` table (replace [USER_IDs])
- [ ] **Step 6**: Update `user_profiles` schema if needed

### In Application:

- [ ] Remove all DUMMY_DOCTORS from PatientDoctorsPage.tsx
- [ ] Remove all DUMMY_REQUESTS from DoctorRequestsPage.tsx
- [ ] Update PatientDoctorsPage to fetch from `doctors` table
- [ ] Update DoctorRequestsPage to fetch from `doctor_requests` table
- [ ] Test booking workflow end-to-end
- [ ] Test real-time notifications
- [ ] Test accept/reject functionality

---

## Testing Checklist

### Patient Side Testing
1. **Browse Doctors**: Load doctors from database ✓
2. **Book Appointment**: Create request with pending status ✓
3. **View Status**: See "Pending" initially ✓
4. **Accept Notification**: See toast & "Accepted" status ✓
5. **Reject Notification**: See rejection reason ✓

### Doctor Side Testing
1. **View Requests**: See list of pending requests ✓
2. **Accept Request**: Update status, patient gets notification ✓
3. **Reject Request**: Add reason, patient gets notification ✓
4. **View History**: See accepted/rejected requests ✓

---

## Important Notes

1. **Doctor User Accounts**: Doctors need separate Supabase auth accounts
2. **Doctor Entry IDs**: "doc-001" format should map to user_ids in auth.users table
3. **Real Data**: All dummy data must be replaced with actual database records
4. **Availability Slots**: Doctor availability should be managed separately
5. **Notifications**: Implemented via real-time subscriptions + toast messages

