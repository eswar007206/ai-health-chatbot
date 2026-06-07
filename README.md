# AI Health Chatbot & Doctor Booking System

**Built for the Micro Labs Hackathon** 🏆
*Selected from an All-India pool of 250 competing students.*

## 🌟 Overview

This project was developed during a highly competitive nationwide hackathon conducted at **Micro Labs**, where I was selected from among 250 students across India. 

The application is a comprehensive **AI Health Chatbot and Doctor Booking System**. It bridges the gap between patients and healthcare providers by offering a seamless, real-time appointment booking and management platform. 

## 🚀 What We Built

We designed and implemented a full-stack, real-time healthcare portal with specialized workflows for both **Patients** and **Doctors**. The system leverages modern web technologies to provide a secure and instant experience.

### 👥 Patient Features
- **Smart Doctor Search:** Browse and search for doctors by name or medical specialty.
- **Location-Based Filtering:** Find nearby clinics using distance calculation.
- **Instant Booking:** Select available time slots and book appointments seamlessly.
- **Real-Time Tracking:** Track booking status (Pending, Accepted, Rejected) in real time without refreshing the page.

### 🩺 Doctor Features
- **Request Management:** View all incoming appointment requests instantly.
- **Patient Insights:** Review patient details and reasons for the visit.
- **Appointment Control:** Accept or reject appointments.
- **Live Notifications:** Status updates immediately reflect on the patient's dashboard.

## 🛠️ Tech Stack

- **Frontend:** React 18, Vite, TypeScript
- **UI & Styling:** Tailwind CSS, Shadcn UI, Lucide Icons
- **Backend & Database:** Supabase (PostgreSQL)
- **Real-Time:** Supabase Realtime Subscriptions
- **Security:** Row Level Security (RLS) for data protection

## 🔐 Security & Architecture

We prioritized data privacy and security, implementing:
- **Row Level Security (RLS):** Patients can only see their own bookings, and doctors can only see requests assigned to them.
- **Role-Based Access:** Distinct metadata roles ensure users only access the appropriate interfaces.
- **Instant Sync:** Utilizing WebSockets via Supabase to instantly sync state across different clients.

## 🏃‍♂️ Running the Project Locally

### Prerequisites
- Node.js (v18+)
- npm or bun
- Supabase Account

### Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. **Database Setup:**
   Run the provided `SUPABASE_DOCTOR_BOOKING_SETUP.sql` or `SUPABASE_SETUP.sql` in your Supabase SQL Editor to generate the necessary tables (`doctors`, `doctor_slots`, `booking_requests`) and RLS policies.

4. **Start the Development Server:**
   ```bash
   npm run dev
   ```

## 🏆 Hackathon Experience at Micro Labs

Competing against 250 top students across India at Micro Labs was a phenomenal experience. It pushed me to design a robust database schema, implement real-time websocket connections under pressure, and create an intuitive UI/UX for a critical real-world use case in the healthcare sector. I am incredibly proud of the end-to-end system I managed to architect and deliver!
