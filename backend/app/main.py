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

@app.post("/api/analyze-report")
async def analyze_report(file: UploadFile = File(...)):
    """
    Analyze a medical report image using Gemini's vision capabilities.
    
    Accepts image files (JPG, PNG, etc.) and returns medical analysis including
    diagnosis, risk level, abnormalities, and treatment recommendations.
    
    Example curl:
    curl -X POST "http://localhost:8000/api/analyze-report" \
      -H "accept: application/json" \
      -F "file=@report.jpg"
    """
    try:
        # Validate file
        if not file.filename:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Validate image type
        if not file.content_type or not file.content_type.startswith("image/"):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Please upload an image file (JPG, PNG, etc.)"
            )
        
        # Read image data
        image_data = await file.read()
        
        # Validate image size (min 100 bytes, max 10MB)
        if len(image_data) < 100:
            raise HTTPException(
                status_code=400,
                detail="Image is too small. Please upload a valid image file."
            )
        
        if len(image_data) > 10 * 1024 * 1024:  # 10MB
            raise HTTPException(
                status_code=413,
                detail="Image file too large (max 10MB)"
            )
        
        # Get MIME type from file
        mime_type = file.content_type
        
        # Analyze using AI service
        try:
            if not ai_service.vision_model:
                raise HTTPException(
                    status_code=500,
                    detail="AI vision service not configured. Please try again later."
                )
            
            # Use Gemini Vision to analyze the medical report
            import base64
            image_base64 = base64.standard_b64encode(image_data).decode("utf-8")
            
            prompt = """You are a medical analysis expert. Analyze this medical report image and provide a comprehensive medical analysis.

Please extract and provide the following information in JSON format:

{
    "raw_text": "Extracted text from the report",
    "biobert": {
        "diagnosis": "Primary diagnosis identified",
        "abnormal_values": "Any abnormal lab values or findings",
        "issues": "Key medical issues found",
        "treatment": "Recommended treatment based on findings",
        "summary": "Brief summary of findings"
    },
    "final_report": {
        "diagnosis": "Confirmed diagnosis",
        "abnormal_values": ["list", "of", "abnormal", "findings"],
        "issues_found": ["list", "of", "medical", "issues"],
        "treatment_plan": {
            "medications": ["medication1", "medication2"],
            "home_care": ["care recommendation 1", "care recommendation 2"],
            "diet": ["diet recommendation 1"],
            "lifestyle": ["lifestyle recommendation 1"]
        },
        "risk_level": {
            "level": "low/moderate/high",
            "reason": "Reason for risk assessment"
        },
        "danger_alerts": ["Alert 1 if any critical findings", "Alert 2 if severe"],
        "follow_up": {
            "tests": ["Recommended follow-up tests"],
            "doctor_visit": "When to see a doctor"
        },
        "patient_summary": "Comprehensive patient summary for consultation with doctor"
    }
}

Ensure the response is valid JSON. If any field cannot be determined from the image, use appropriate null values or empty arrays."""

            response = ai_service.vision_model.generate_content(
                [
                    {
                        "mime_type": mime_type,
                        "data": image_base64
                    },
                    prompt
                ]
            )
            
            # Parse the response
            import json
            response_text = response.text
            
            # Try to extract JSON from the response
            try:
                # Look for JSON block in response
                if "```json" in response_text:
                    json_str = response_text.split("```json")[1].split("```")[0].strip()
                elif "```" in response_text:
                    json_str = response_text.split("```")[1].split("```")[0].strip()
                else:
                    json_str = response_text
                
                analysis = json.loads(json_str)
            except (json.JSONDecodeError, IndexError):
                # If JSON parsing fails, create a structured response
                analysis = {
                    "raw_text": response_text,
                    "biobert": {
                        "summary": response_text,
                        "diagnosis": "Unable to parse structured data",
                        "abnormal_values": "",
                        "issues": "",
                        "treatment": ""
                    },
                    "final_report": {
                        "diagnosis": "Analysis in progress",
                        "abnormal_values": [],
                        "issues_found": [],
                        "treatment_plan": {
                            "medications": [],
                            "home_care": ["Please consult with a healthcare provider"],
                            "diet": [],
                            "lifestyle": []
                        },
                        "risk_level": {
                            "level": "moderate",
                            "reason": "Report analysis pending medical review"
                        },
                        "danger_alerts": [],
                        "follow_up": {
                            "tests": [],
                            "doctor_visit": "As soon as possible for professional review"
                        },
                        "patient_summary": response_text
                    }
                }
            
            return {
                "analysis": analysis.get("final_report", {}),
                "final_report": analysis.get("final_report", {}),
                "biobert": analysis.get("biobert", {}),
                "raw_text": analysis.get("raw_text", "")
            }
        
        except AttributeError:
            raise HTTPException(
                status_code=500,
                detail="AI model not properly initialized. Please try again later."
            )
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error in analyze-report: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Report analysis failed: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
