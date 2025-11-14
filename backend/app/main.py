"""
FeverEase Backend - Main Application Entry Point

This file contains the FastAPI application setup and main endpoints,
integrating AI-powered medical analysis and information retrieval.
"""

from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
from dotenv import load_dotenv

from app.services.symptom_analyzer import SymptomAnalyzer
from app.services.ai_service import AIService
from app.services.speech_service import speech_service

# Optionally import ChatService
try:
    from app.services.chat_service import ChatService
    HAS_CHAT_SERVICE = True
except ImportError:
    ChatService = None  # type: ignore
    print("Chat service unavailable - some features will be limited")
    HAS_CHAT_SERVICE = False

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="FeverEase API",
    description="AI-powered medical guidance API",
    version="1.0.0",
)

# ✅ Configure CORS properly for Render deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        # Local development (Vite)
        "http://localhost:8080",
        "http://127.0.0.1:8080",
        # Alternative Vite default port
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        # Deployed frontend
        "https://fever-ai-helper.onrender.com",  # ✅ your frontend on Render
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize services
symptom_analyzer = SymptomAnalyzer()
ai_service = AIService()
chat_service = ChatService() if HAS_CHAT_SERVICE and ChatService else None

# Request/Response Models
class SymptomAnalysisRequest(BaseModel):
    temperature: Optional[float] = None
    duration_hours: Optional[int] = None
    age_years: Optional[int] = None
    symptoms: List[str]
    additional_info: Optional[Dict[str, Any]] = None

class MedicineRequest(BaseModel):
    name: str

class ChatMessage(BaseModel):
    message: str
    history: Optional[List[Dict]] = None

class SpeechToTextResponse(BaseModel):
    text: str
    confidence: float

class SymptomsResponse(BaseModel):
    ai_analysis: Dict[str, Any]
    rule_based_analysis: Dict[str, Any]
    combined_recommendations: List[str]

@app.get("/")
async def root():
    return {"message": "FeverEase API", "version": "1.0.0", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.post("/api/analyze-symptoms", response_model=SymptomsResponse)
async def analyze_symptoms(request: SymptomAnalysisRequest):
    try:
        rule_based = symptom_analyzer.analyze_fever(
            temperature=request.temperature or 0.0,
            duration_hours=request.duration_hours or 0,
            age_years=request.age_years,
            additional_symptoms=request.symptoms
        )

        patient_info = {
            "age": request.age_years,
            "temperature": request.temperature,
            "duration_hours": request.duration_hours
        }
        if request.additional_info:
            patient_info.update(request.additional_info)

        ai_results = await ai_service.analyze_symptoms(
            symptoms=request.symptoms,
            patient_info=patient_info
        )

        all_recommendations = set(
            rule_based.get("recommendations", []) +
            ai_results.get("recommendations", [])
        )

        return {
            "ai_analysis": ai_results,
            "rule_based_analysis": rule_based,
            "combined_recommendations": list(all_recommendations)
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/medicine-info")
async def get_medicine_info(request: MedicineRequest):
    try:
        result = await ai_service.get_medicine_info(request.name)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/medicine-search")
async def search_medicines(query: str):
    try:
        search_method = getattr(ai_service, '_search_medicine_database', None)
        if search_method:
            results = search_method(query)
            return {"results": results if results else []}
        return {"results": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat")
async def chat_endpoint(chat_message: ChatMessage):
    if not chat_service:
        return {
            "response": "Chat service is currently unavailable. Please try the symptom analysis endpoint instead.",
            "error": "Chat service not initialized"
        }

    try:
        response = await chat_service.process_message(
            message=chat_message.message,
            chat_history=chat_message.history or []
        )
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/speech-to-text", response_model=SpeechToTextResponse)
async def speech_to_text(file: UploadFile = File(...)):
    """
    Convert speech audio to text using Gemini Speech API
    
    Accepts audio files in WebM, WAV, MP3, or other common formats.
    Returns the transcribed text and confidence score.
    
    Example curl:
    curl -X POST "http://localhost:8000/api/speech-to-text" \
      -H "accept: application/json" \
      -F "file=@audio.webm"
    """
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Read audio data
        audio_data = await file.read()
        
        # Validate audio size (min 100 bytes, max 50MB)
        if len(audio_data) < 100:
            raise HTTPException(
                status_code=400,
                detail="No audio detected. Try again."
            )
        
        if len(audio_data) > 50 * 1024 * 1024:  # 50MB
            raise HTTPException(
                status_code=413,
                detail="Audio file too large (max 50MB)"
            )
        
        # Get MIME type from file
        mime_type = file.content_type or "audio/webm"
        
        # Transcribe using speech service
        try:
            result = await speech_service.transcribe_audio(audio_data, mime_type)
            return SpeechToTextResponse(
                text=result["text"],
                confidence=result.get("confidence", 0.95)
            )
        except ValueError as e:
            error_msg = str(e)
            if "GEMINI_API_KEY" in error_msg or "not set" in error_msg:
                raise HTTPException(
                    status_code=500,
                    detail="Speech recognition service not configured (GEMINI_API_KEY missing)"
                )
            elif "No audio" in error_msg or "audio data" in error_msg.lower():
                raise HTTPException(
                    status_code=400,
                    detail="No audio detected. Try again."
                )
            else:
                raise HTTPException(
                    status_code=500,
                    detail="Speech recognition failed — please try again or type your message."
                )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error in speech-to-text: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="Speech recognition failed — please try again or type your message."
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
