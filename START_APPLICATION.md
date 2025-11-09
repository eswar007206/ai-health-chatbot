# 🚀 How to Start Frontend and Backend

## Prerequisites
- ✅ Models trained (you've done this!)
- ✅ Python dependencies installed
- ✅ Node.js dependencies installed (`npm install`)
- ✅ `.env` file with `GEMINI_API_KEY` in `backend/` folder

## Step 1: Start Backend Server

Open **Terminal 1** (or Command Prompt):

```bash
# Navigate to backend folder
cd backend

# Activate virtual environment (if using one)
# On Windows:
venv-3.11\Scripts\activate

# Start the FastAPI server
python -m uvicorn app.main:app --reload
```

**You should see:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
✓ Disease classifier loaded
✓ Severity classifier loaded
✓ Emergency classifier loaded
ChatService initialized with Gemini AI, knowledge base, and trained models
```

**Backend runs on:** `http://localhost:8000`

---

## Step 2: Start Frontend Server

Open **Terminal 2** (new terminal window):

```bash
# Navigate to project root (where package.json is)
cd "C:\Coding\Web Development\React Projects\fever-ai-helper-main"

# Start the frontend dev server
npm run dev
```

**You should see:**
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:8080/
  ➜  Network: use --host to expose
```

**Frontend runs on:** `http://localhost:8080`

---

## Step 3: Test Your Bot! 🎉

1. **Open your browser:** Go to `http://localhost:8080`

2. **Sign up/Sign in:** Create an account or sign in

3. **Test the bot with different inputs:**
   - Clear input: "I have a fever of 102°F and headache"
   - Weird input: "feeling like crap, hot and sweaty"
   - Ambiguous: "not feeling well"
   - Complex: "My 5-year-old has been running a temperature for 2 days"

4. **Check the backend terminal** - You should see:
   - API requests coming in
   - Model predictions being made
   - Gemini processing messages

---

## Quick Commands Summary

### Terminal 1 (Backend):
```bash
cd backend
python -m uvicorn app.main:app --reload
```

### Terminal 2 (Frontend):
```bash
npm run dev
```

---

## Troubleshooting

### Backend won't start?
- Check if port 8000 is already in use
- Make sure you're in the `backend` folder
- Check if `.env` file exists with `GEMINI_API_KEY`

### Frontend won't start?
- Run `npm install` first
- Check if port 8080 is available
- Make sure you're in the project root folder

### Models not loading?
- Check `backend/models/` folder has these files:
  - `disease_classifier.joblib`
  - `severity_classifier.joblib`
  - `emergency_classifier.joblib`
  - `symptom_embeddings.npy`
  - `disease_embeddings.npy`

### API connection error?
- Make sure backend is running on port 8000
- Check `src/config/api.ts` - should point to `http://localhost:8000`

---

## What to Expect

When you send a message:
1. ✅ Frontend sends to backend API
2. ✅ Backend loads your trained models
3. ✅ Backend uses knowledge base data
4. ✅ Backend calls Gemini API
5. ✅ Gemini combines everything
6. ✅ Response sent back to frontend
7. ✅ Message appears in chat!

**Your bot is now using:**
- 🤖 Your trained models
- 📚 Your knowledge base
- 🧠 Gemini AI

Enjoy testing! 🎉

