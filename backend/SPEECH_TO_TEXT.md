# Speech-to-Text Feature Implementation

This document describes the Speech-to-Text integration using Google Gemini API.

## Overview

Users can now click a microphone icon in the chat input area to record their voice. The audio is sent to the backend, transcribed using Gemini's speech-to-text API, and automatically sent as a chat message.

## Setup Instructions

### 1. Environment Variables

Add the following environment variable to your backend `.env` file:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
```

Obtain your API key from [Google AI Studio](https://aistudio.google.com/app/apikey).

### 2. Install Dependencies

The required dependencies are already in `requirements.txt`:
- `google-generativeai>=0.3.2` - Gemini API SDK
- `requests==2.31.0` - HTTP requests (fallback)
- `python-multipart==0.0.6` - FastAPI file uploads
- `pytest` and related testing packages

To install/update:

```bash
cd backend
pip install -r requirements.txt
```

### 3. Frontend Configuration

Frontend uses the `VITE_API_URL` environment variable (already configured).

Ensure `src/config/api.ts` includes the speech-to-text endpoint (already added).

## Architecture

### Frontend (`src/components/ChatInput.tsx`)

**Features:**
- Microphone icon button for recording
- Audio recording using `MediaRecorder` API
- Records in WebM format (Chrome/Chromium default)
- Auto-stop after 10 seconds of recording
- Manual stop on second click
- Toast notifications for errors
- Automatic message sending after transcription

**Flow:**
1. User clicks microphone icon
2. Browser requests microphone permission
3. Recording starts, button shows red pulsing animation
4. On stop (manual or auto-timeout), audio is sent to backend
5. Backend returns transcribed text
6. Text auto-inserts and sends through existing chat flow

### Backend

#### Route: `POST /api/speech-to-text`

**Input:**
- Multipart form data with audio file

**Output:**
```json
{
  "text": "I have a fever and a cough",
  "confidence": 0.95
}
```

**Error Responses:**
- `400`: No audio detected or file too small
- `413`: Audio file too large (>50MB)
- `500`: Transcription failed

#### Service: `app/services/speech_service.py`

**Class:** `SpeechService`

**Methods:**
- `transcribe_audio(audio_data, mime_type)` - Main transcription method
  - Uses Gemini Files API (preferred)
  - Falls back to direct HTTP method if needed
  - Includes retry logic (2 retries for 5xx errors)
  - Returns `{"text": str, "confidence": float}`

- `validate_audio(audio_data)` - Validates audio before processing

**Environment:**
- Reads `GEMINI_API_KEY` from environment
- Configures Gemini SDK automatically
- Supports both sync and async contexts

## Usage Examples

### Manual Testing with curl

Start the backend:
```bash
cd backend
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Test the endpoint:
```bash
# Record audio first (example on macOS)
# Or download a sample audio file (WebM, WAV, MP3 supported)

curl -X POST "http://localhost:8000/api/speech-to-text" \
  -F "file=@audio.webm" \
  -H "accept: application/json"

# Response:
# {
#   "text": "I have a fever and a cough",
#   "confidence": 0.95
# }
```

### Testing in Frontend

1. Run the application locally
2. Navigate to the chat interface
3. Click the microphone icon
4. Allow microphone permission when prompted
5. Speak your message (max 10 seconds)
6. Stop recording (auto-stops after 10s or click again)
7. Transcribed text should appear and auto-send

## Error Handling

### Frontend Errors

1. **Permission Denied**
   - Message: "Microphone permission denied. Please allow microphone access in your browser settings."
   - Cause: User denied microphone permission
   - Fix: Allow permission in browser settings

2. **No Audio Detected**
   - Message: "No audio detected. Try again."
   - Cause: Recording too short or silent
   - Fix: Speak louder or longer (>100 bytes)

3. **Transcription Failed**
   - Message: "Speech recognition failed — please try again or type your message."
   - Cause: Gemini API error or network issue
   - Fix: Check internet connection, verify GEMINI_API_KEY

4. **Service Not Configured**
   - Message: "Speech recognition service not configured. Please contact support."
   - Cause: GEMINI_API_KEY not set
   - Fix: Set GEMINI_API_KEY environment variable

### Backend Errors

All errors return JSON with a `detail` field explaining the issue.

## Testing

### Unit Tests

Run the test suite:
```bash
cd backend
pytest tests/test_speech_service.py -v
```

With coverage:
```bash
pytest tests/test_speech_service.py --cov=app.services.speech_service -v
```

**Test Coverage:**
- ✅ Successful transcription
- ✅ Empty file validation
- ✅ Small file validation
- ✅ Transcription errors
- ✅ Missing API key errors
- ✅ Audio validation

### Manual QA Checklist

- [ ] **Permission Flow**
  - [ ] First mic click requests permission
  - [ ] Deny: Shows error message
  - [ ] Allow: Recording starts

- [ ] **Recording**
  - [ ] Mic button turns red with pulsing animation
  - [ ] Timer shows recording time
  - [ ] Auto-stops after 10 seconds
  - [ ] Manual stop on second click

- [ ] **Transcription**
  - [ ] Speaks short phrase
  - [ ] Text appears in input field
  - [ ] Message auto-sends
  - [ ] Chat shows user message and bot response

- [ ] **Error Handling**
  - [ ] Deny permission: error toast
  - [ ] No audio: error toast
  - [ ] Network offline: error toast
  - [ ] No GEMINI_API_KEY: error toast

- [ ] **Edge Cases**
  - [ ] Record silence: error
  - [ ] Record for exactly 10s: stops automatically
  - [ ] Record, wait 1s, click mic: message sends
  - [ ] Recording + typing: textarea disabled during recording
  - [ ] Large audio file (50MB+): file too large error

## Supported Audio Formats

- **WebM** (preferred for Chrome/Chromium)
- **WAV**
- **MP3**
- **OGG**

Browser automatically selects best available format. Frontend defaults to WebM, backend accepts any format via MIME type.

## Gemini API Details

### Current Implementation

- **Model**: Configurable via `GEMINI_SPEECH_MODEL` (defaults to `gemini-pro-vision`)
- **Method**: Files API (recommended for audio)
- **Fallback**: Direct HTTP to Gemini API
- **Timeout**: 30 seconds
- **Max Retries**: 2 (for transient 5xx errors)
- **Max File Size**: 50MB

### Confidence Scoring

Gemini doesn't provide explicit confidence in its speech API responses. The implementation returns:
- `0.95` for successful transcriptions
- This can be updated if Gemini API adds confidence scores in future versions

### Cost Considerations

- Gemini API has usage tiers and rates
- Consider adding rate limiting for production use
- Monitor usage via [Google Cloud Console](https://console.cloud.google.com/)

## Future Improvements

1. **Voice Activity Detection (VAD)**
   - Stop recording on silence instead of fixed timeout
   - Reduces unnecessary audio transmission

2. **Streaming Support**
   - Send audio chunks as recording happens
   - Faster transcription display

3. **Language Detection**
   - Auto-detect speaker language
   - Support multi-language transcription

4. **Confidence Thresholds**
   - Ask user to repeat if confidence < threshold
   - Improve accuracy for important medical info

5. **Audio Format Optimization**
   - Automatic format compression
   - Reduce file size before sending

6. **Real-time Waveform Visualization**
   - Show audio levels during recording
   - Help users understand audio quality

## Troubleshooting

### "GEMINI_API_KEY not found"

```bash
# Check environment variable
echo $GEMINI_API_KEY

# Set it (if not set)
export GEMINI_API_KEY="your_key_here"

# Or add to .env file
echo "GEMINI_API_KEY=your_key_here" >> backend/.env
```

### "Microphone not working"

- Check browser permissions (chrome://settings/content/microphone)
- Ensure HTTPS on production (required by WebRTC)
- Test with different browser

### "Transcription gives wrong text"

- Ensure audio quality is good
- Speak clearly and at normal volume
- Check if language detection is working (should be auto)
- Consider re-recording if background noise is high

### "Backend connection error"

- Verify `VITE_API_URL` environment variable
- Check backend is running: `curl http://localhost:8000/health`
- Verify CORS settings in `app.main.py`

## Files Modified

### Frontend
- `src/components/ChatInput.tsx` - Added microphone recording logic and UI
- `src/config/api.ts` - Added SPEECH_TO_TEXT endpoint

### Backend
- `backend/app/main.py` - Added POST /api/speech-to-text route
- `backend/app/services/speech_service.py` - New speech transcription service
- `backend/tests/test_speech_service.py` - Test suite

### Dependencies
- All dependencies already in `backend/requirements.txt`

## Notes

- Recording is limited to 10 seconds to prevent extremely large uploads
- Audio is immediately deleted from memory after processing
- No audio is stored on the server
- Transcripts are only sent to Gemini API, not logged
- GEMINI_API_KEY should never be exposed to frontend

---

**Version**: 1.0.0  
**Last Updated**: November 14, 2024  
**Feature**: Speech-to-Text Integration (Gemini)
