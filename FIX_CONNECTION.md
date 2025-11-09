# 🔧 Fix: Frontend-Backend Connection Issue

## Problem
- Backend is running on: `http://127.0.0.1:8000` (localhost)
- Frontend is trying to connect to: `http://192.168.31.204:8000` (network IP)
- Error: `ERR_CONNECTION_REFUSED`

## Solution

Your `.env` file has `VITE_API_URL="http://192.168.31.204:8000"` which overrides the code.

### Option 1: Update .env file (Recommended)

Open your `.env` file in the **project root** and change:

**From:**
```
VITE_API_URL="http://192.168.31.204:8000"
```

**To:**
```
VITE_API_URL="http://localhost:8000"
```

### Option 2: Remove VITE_API_URL from .env

Or simply remove/comment out the `VITE_API_URL` line:
```
# VITE_API_URL="http://192.168.31.204:8000"
```

This will make it use the default `localhost:8000` from `src/config/api.ts`.

## After Fixing

1. **Save the `.env` file**
2. **Restart the frontend** (stop with Ctrl+C and run `npm run dev` again)
3. **Refresh your browser** (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)
4. **Test again** - send "hi" in the chat

## Verify Backend is Running

In your backend terminal, you should see:
```
INFO: Uvicorn running on http://127.0.0.1:8000
```

You can also test by opening in browser:
- http://localhost:8000 → Should show API info
- http://localhost:8000/health → Should show `{"status":"healthy"}`

## Why This Happened

Vite environment variables (like `VITE_API_URL`) take precedence over code defaults. Since your `.env` had the network IP, it was trying to connect there instead of localhost.

