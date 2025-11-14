"""
Test suite for Speech-to-Text endpoint

Run with: pytest tests/test_speech_service.py -v
Or with coverage: pytest tests/test_speech_service.py --cov=app.services.speech_service -v
"""

import pytest
import pytest_asyncio
from unittest.mock import patch, MagicMock, AsyncMock
import io
from fastapi.testclient import TestClient

# Adjust imports based on your project structure
from app.main import app

client = TestClient(app)


class TestSpeechToTextEndpoint:
    """Test the POST /api/speech-to-text endpoint"""
    
    @patch('app.services.speech_service.speech_service.transcribe_audio')
    def test_speech_to_text_success(self, mock_transcribe):
        """Test successful speech-to-text transcription"""
        # Mock the transcription service
        mock_transcribe.return_value = {
            "text": "I have a fever and a cough",
            "confidence": 0.95
        }
        
        # Create a mock audio file
        audio_data = b'\xff\xfb\x90\x00' * 100  # Dummy WebM-like data (400+ bytes)
        files = {'file': ('audio.webm', io.BytesIO(audio_data), 'audio/webm')}
        
        # Send POST request (async version requires sync wrapper in tests)
        response = client.post('/api/speech-to-text', files=files)
        
        assert response.status_code == 200
        data = response.json()
        assert data['text'] == "I have a fever and a cough"
        assert data['confidence'] == 0.95
    
    def test_speech_to_text_no_file(self):
        """Test error when no file is provided"""
        response = client.post('/api/speech-to-text')
        
        assert response.status_code == 422  # Validation error for missing file
    
    def test_speech_to_text_empty_file(self):
        """Test error when file is too small"""
        files = {'file': ('audio.webm', io.BytesIO(b''), 'audio/webm')}
        response = client.post('/api/speech-to-text', files=files)
        
        assert response.status_code == 400
        assert "No audio detected" in response.json()['detail']
    
    @patch('app.services.speech_service.speech_service.transcribe_audio')
    def test_speech_to_text_transcription_error(self, mock_transcribe):
        """Test error handling when Gemini API fails"""
        # Mock transcription failure
        mock_transcribe.side_effect = ValueError("Speech recognition failed")
        
        audio_data = b'\xff\xfb\x90\x00' * 100  # Dummy data (400+ bytes)
        files = {'file': ('audio.webm', io.BytesIO(audio_data), 'audio/webm')}
        
        response = client.post('/api/speech-to-text', files=files)
        
        assert response.status_code == 500
        assert "Speech recognition failed" in response.json()['detail']
    
    @patch('app.services.speech_service.speech_service.transcribe_audio')
    def test_speech_to_text_missing_gemini_key(self, mock_transcribe):
        """Test error when GEMINI_API_KEY is not configured"""
        # Mock missing API key error
        mock_transcribe.side_effect = ValueError("GEMINI_API_KEY not set in environment variables")
        
        audio_data = b'\xff\xfb\x90\x00' * 100
        files = {'file': ('audio.webm', io.BytesIO(audio_data), 'audio/webm')}
        
        response = client.post('/api/speech-to-text', files=files)
        
        assert response.status_code == 500
        assert "not configured" in response.json()['detail'].lower()


class TestSpeechService:
    """Test the SpeechService class directly"""
    
    @pytest.mark.asyncio
    @patch('app.services.speech_service.genai.upload_file')
    @patch('app.services.speech_service.genai.GenerativeModel')
    async def test_transcribe_audio_with_gemini(self, mock_model_class, mock_upload):
        """Test audio transcription using Gemini SDK"""
        from app.services.speech_service import SpeechService
        
        # Mock the file upload and model response
        mock_uploaded_file = MagicMock()
        mock_uploaded_file.uri = "https://example.com/file.webm"
        mock_upload.return_value = mock_uploaded_file
        
        mock_model_instance = MagicMock()
        mock_model_instance.generate_content.return_value = MagicMock(text="Hello world")
        mock_model_class.return_value = mock_model_instance
        
        service = SpeechService()
        audio_data = b'\xff\xfb\x90\x00' * 100
        
        result = await service.transcribe_audio(audio_data, "audio/webm")
        
        assert result['text'] == "Hello world"
        assert result['confidence'] == 0.95
    
    @pytest.mark.asyncio
    async def test_transcribe_audio_empty_data(self):
        """Test error handling for empty audio data"""
        from app.services.speech_service import SpeechService
        
        service = SpeechService()
        
        with pytest.raises(ValueError, match="No audio data"):
            await service.transcribe_audio(b'', "audio/webm")
    
    def test_validate_audio_success(self):
        """Test audio validation for valid audio"""
        from app.services.speech_service import SpeechService
        
        service = SpeechService()
        audio_data = b'\xff\xfb\x90\x00' * 100
        
        assert service.validate_audio(audio_data) is True
    
    def test_validate_audio_too_small(self):
        """Test audio validation for too small audio"""
        from app.services.speech_service import SpeechService
        
        service = SpeechService()
        audio_data = b'abc'
        
        assert service.validate_audio(audio_data) is False
    
    def test_validate_audio_empty(self):
        """Test audio validation for empty audio"""
        from app.services.speech_service import SpeechService
        
        service = SpeechService()
        
        assert service.validate_audio(b'') is False


class TestIntegration:
    """Integration tests (requires GEMINI_API_KEY set)"""
    
    @pytest.mark.skipif(
        True,  # Skip by default - only run when explicitly needed
        reason="Requires valid GEMINI_API_KEY and live Gemini API"
    )
    @pytest.mark.asyncio
    async def test_live_speech_to_text(self):
        """Test with real Gemini API (requires valid API key)"""
        # This test is skipped by default but can be run manually
        # Set GEMINI_API_KEY environment variable to run this test
        from app.services.speech_service import SpeechService
        
        service = SpeechService()
        
        # Load a real audio file or generate one
        # For testing purposes, you would need actual audio data
        # This is left as a placeholder
        pass


if __name__ == "__main__":
    # Run tests with: python -m pytest tests/test_speech_service.py -v
    pytest.main([__file__, "-v", "--tb=short"])
