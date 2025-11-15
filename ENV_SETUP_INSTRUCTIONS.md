# 🔧 Quick Fix: Update Supabase Configuration

## The Problem
Your app is using an old Supabase URL (`wgkcbkuvoblmnqghjyhg.supabase.co`) instead of your new one.

## The Solution

### 1. Get Your New Supabase Credentials

Go to your **NEW** Supabase project:
1. Open Supabase Dashboard
2. Go to **Project Settings** (gear icon) → **API**
3. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

### 2. Create `.env` File

**In your project root** (same folder as `package.json`), create a file named `.env`:

```env
VITE_SUPABASE_URL=https://your-new-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-new-anon-key-here
```

**Replace:**
- `your-new-project-id` with your actual project ID
- `your-new-anon-key-here` with your actual anon key

### 3. Restart Your Server

**CRITICAL:** After creating/updating `.env`:

1. **Stop** your dev server (press `Ctrl+C` in terminal)
2. **Start** it again:
   ```bash
   npm run dev
   ```

### 4. Clear Browser Cache

1. Press `F12` to open Developer Tools
2. Go to **Application** tab
3. Click **Clear storage** → **Clear site data**
4. Refresh the page

## ✅ Verify It's Working

After restarting, check:
- Browser Console (F12) → Network tab
- Look for requests to your **NEW** Supabase URL
- The old URL should be gone!

## 📝 Example `.env` File

```env
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYxNjIzOTAyMiwiZXhwIjoxOTMxODE1MDIyfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

**Important Notes:**
- No spaces around the `=` sign
- No quotes needed
- File must be named exactly `.env` (with the dot)
- Must be in the root directory (not in `src/` or `backend/`)


