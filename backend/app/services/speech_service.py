"""
Speech-to-Text Service

This service handles audio transcription using the Gemini Speech API.
It converts audio files (WebM, WAV, etc.) to text using Google's Gemini AI.
"""

import os
import base64
from typing import Dict, Any, Optional
import io
from dotenv import load_dotenv

# Try to import Gemini AI
try:
    import google.generativeai as genai
    HAS_GEMINI = True
except ImportError:
    print("Warning: Failed to import google.generativeai")
    HAS_GEMINI = False

# Try to import requests for fallback HTTP method
try:
    import requests
    HAS_REQUESTS = True
except ImportError:
    print("Warning: Failed to import requests")
    HAS_REQUESTS = False

# Load environment variables
load_dotenv()

class SpeechService:
    """Service for converting audio to text using Gemini Speech API"""
    
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            print("Warning: GEMINI_API_KEY not found in environment variables")
        
        if HAS_GEMINI and self.api_key:
            genai.configure(api_key=self.api_key)
            print(f"SpeechService configured with Gemini API key: {self.api_key[:5]}...")
        
        self.max_retries = 2
        self.timeout = 30
    
    async def transcribe_audio(self, audio_data: bytes, mime_type: str = "audio/webm") -> Dict[str, Any]:
        """
        Transcribe audio using Gemini Speech API
        
        Args:
            audio_data: Raw audio bytes
            mime_type: MIME type of audio (e.g., 'audio/webm', 'audio/wav', 'audio/mp3')
            
        Returns:
            Dict with 'text' (transcription) and 'confidence' (0.0-1.0)
            Raises ValueError if transcription fails
        """
        if not audio_data:
            raise ValueError("No audio data provided")
        
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not set in environment variables")
        
        # Try Gemini API method first
        if HAS_GEMINI:
            try:
                return await self._transcribe_with_gemini(audio_data, mime_type)
            except Exception as e:
                print(f"Gemini transcription failed: {e}")
                # Fall back to HTTP method if available
                if HAS_REQUESTS:
                    print("Falling back to direct HTTP method...")
                    try:
                        return await self._transcribe_with_http(audio_data, mime_type)
                    except Exception as http_error:
                        raise ValueError(f"All transcription methods failed: {str(e)}, {str(http_error)}")
                else:
                    raise
        
        # Fall back to HTTP method if Gemini SDK not available
        if HAS_REQUESTS:
            return await self._transcribe_with_http(audio_data, mime_type)
        
        raise ValueError("Neither Gemini SDK nor requests library available for transcription")
    
    async def _transcribe_with_gemini(self, audio_data: bytes, mime_type: str) -> Dict[str, Any]:
        """
        Use Gemini SDK for transcription (preferred method)
        
        TODO: Replace endpoint/format with latest Gemini audio API if needed
        Current implementation uses genai.upload_file and GenerativeModel for audio processing
        """
        import asyncio
        
        # Convert bytes to base64 for SDK usage
        # Note: Some Gemini models accept audio via upload_file or direct base64
        
        # Method 1: Try using the Files API (recommended for audio)
        try:
            print("Attempting Gemini speech transcription via Files API...")
            
            # Create a file-like object from bytes
            audio_file = io.BytesIO(audio_data)
            audio_file.name = "speech.webm"
            
            # Use asyncio to thread the blocking call
            def upload_file():
                return genai.upload_file(
                    path=audio_file,
                    mime_type=mime_type
                )
            
            uploaded_file = await asyncio.to_thread(upload_file)
            print(f"File uploaded: {uploaded_file.uri}")
            
            # Create model for transcription
            model = genai.GenerativeModel("gemini-1.5-flash")
            
            def generate_transcription():
                response = model.generate_content([
                    "Please transcribe this audio file. Respond with only the transcription text.",
                    uploaded_file
                ])
                return response.text
            
            transcript = await asyncio.to_thread(generate_transcription)
            
            # Return with confidence (Gemini doesn't provide explicit confidence, default to 0.95)
            return {
                "text": transcript.strip(),
                "confidence": 0.95
            }
        
        except Exception as e:
            print(f"Files API method failed: {e}")
            raise
    
    async def _transcribe_with_http(self, audio_data: bytes, mime_type: str) -> Dict[str, Any]:
        """
        Use direct HTTP call to Gemini API (alternative method)
        
        This method sends audio as base64 to the Gemini speech endpoint.
        Includes retry logic for transient 5xx errors.
        """
        import asyncio
        
        if not HAS_REQUESTS:
            raise ValueError("requests library not available")
        
        # Encode audio as base64
        audio_base64 = base64.b64encode(audio_data).decode('utf-8')
        
        # Gemini API endpoint for speech (as of Nov 2024)
        # TODO: Verify this is the latest endpoint - check Google's documentation
        endpoint = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent"
        
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
        # Prepare request body with audio data
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "inline_data": {
                                "mime_type": mime_type,
                                "data": audio_base64
                            }
                        },
                        {
                            "text": "Please transcribe this audio. Respond with only the transcription text."
                        }
                    ]
                }
            ]
        }
        
        # Retry logic for transient errors (max 2 retries)
        for attempt in range(self.max_retries + 1):
            try:
                def make_request():
                    return requests.post(
                        endpoint,
                        json=payload,
                        headers=headers,
                        timeout=self.timeout,
                        params={"key": self.api_key}
                    )
                
                response = await asyncio.to_thread(make_request)
                response.raise_for_status()
                
                result = response.json()
                
                # Extract text from response
                if "candidates" in result and len(result["candidates"]) > 0:
                    candidate = result["candidates"][0]
                    if "content" in candidate and "parts" in candidate["content"]:
                        parts = candidate["content"]["parts"]
                        if len(parts) > 0 and "text" in parts[0]:
                            transcript = parts[0]["text"]
                            return {
                                "text": transcript.strip(),
                                "confidence": 0.95
                            }
                
                raise ValueError("Unexpected response format from Gemini API")
            
            except requests.exceptions.HTTPError as e:
                if response.status_code >= 500 and attempt < self.max_retries:
                    print(f"Server error (attempt {attempt + 1}/{self.max_retries + 1}): {e}")
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
                    continue
                raise ValueError(f"Gemini API error: {e}")
            
            except requests.exceptions.RequestException as e:
                raise ValueError(f"Network error during transcription: {e}")
        
        raise ValueError("Failed to transcribe audio after retries")
    
    def validate_audio(self, audio_data: bytes, min_size: int = 100) -> bool:
        """
        Validate audio data
        
        Args:
            audio_data: Audio bytes to validate
            min_size: Minimum acceptable size in bytes
            
        Returns:
            True if audio is valid, False otherwise
        """
        if not audio_data:
            return False
        
        if len(audio_data) < min_size:
            return False
        
        return True


# Create singleton instance
speech_service = SpeechService()
