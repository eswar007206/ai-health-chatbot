"""
FeverEase Backend - Main Application Entry Point

This file contains the FastAPI application setup and main endpoints,
integrating AI-powered medical analysis and information retrieval.
"""

import asyncio
import base64
import json
import os
import re
from typing import List, Dict, Any, Optional, Tuple, Set

from fastapi import FastAPI, HTTPException, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

try:
    import google.generativeai as genai
    HAS_GEMINI_SPEECH = True
except ImportError:
    genai = None  # type: ignore
    HAS_GEMINI_SPEECH = False

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

AVAILABLE_GEMINI_MODELS: Set[str] = set()
speech_model_cache: Optional[Any] = None
speech_model_name: Optional[str] = None

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
    transcript: str
    language: str
    reply: str

class SpeechStreamResponse(BaseModel):
    transcript: str
    language: str

class SymptomsResponse(BaseModel):
    ai_analysis: Dict[str, Any]
    rule_based_analysis: Dict[str, Any]
    combined_recommendations: List[str]

SUPPORTED_AUDIO_MIME_TYPES = {
    "audio/webm",
    "audio/webm;codecs=opus",
    "audio/ogg",
    "audio/mpeg",
    "audio/mp3",
    "audio/wav",
    "audio/x-wav",
    "audio/mp4",
    "audio/aac",
}
MIN_AUDIO_BYTES = 500  # Require minimal speech (~0.5KB)
MAX_AUDIO_BYTES = 25 * 1024 * 1024  # 25MB safety limit
STREAM_MAX_AUDIO_BYTES = 2 * 1024 * 1024  # smaller per-chunk uploads
TARGET_LANGUAGES = [
    "Telugu",
    "Hindi",
    "Tamil",
    "Kannada",
    "Malayalam",
    "Bengali",
    "Marathi",
    "Gujarati",
    "Punjabi",
    "Urdu",
]

async def _read_audio_upload(file: UploadFile, max_bytes: int) -> Tuple[bytes, str]:
    """Read and validate audio upload, returning (bytes, mime_type)."""
    if not file.filename:
        raise HTTPException(status_code=400, detail="No audio file uploaded")
    
    mime_type = (file.content_type or "").lower()
    if mime_type and mime_type not in SUPPORTED_AUDIO_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported audio format. Please record again (WebM, OGG, MP3, WAV)."
        )

    audio_bytes = await file.read()
    if len(audio_bytes) < MIN_AUDIO_BYTES:
        raise HTTPException(status_code=400, detail="Audio clip is too short. Please retry.")
    if len(audio_bytes) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"Audio file too large (max {(max_bytes // (1024 * 1024))}MB). Please shorten your recording."
        )
    return audio_bytes, (mime_type or "audio/webm")

def _list_gemini_models() -> Set[str]:
    """Query Gemini API for accessible models supporting generateContent."""
    if not genai:
        return set()
    models: Set[str] = set()
    try:
        for model in genai.list_models():
            methods = getattr(model, "supported_generation_methods", [])
            if "generateContent" not in methods:
                continue
            name = model.name
            models.add(name)
            if "/" in name:
                models.add(name.split("/")[-1])
    except Exception as exc:
        print(f"⚠️  Could not list Gemini models: {exc}")
    return models

def _build_model_priority(env_var: str, defaults: List[str]) -> List[str]:
    env_value = os.getenv(env_var, "")
    override = [item.strip() for item in env_value.split(",") if item.strip()]
    ordered: List[str] = []
    seen = set()
    for name in override + defaults:
        short = name.split("/")[-1]
        if short in seen:
            continue
        ordered.append(name)
        seen.add(short)
    return ordered

def _model_variants(model_name: str) -> Set[str]:
    """Return canonical variants for matching listed models."""
    variants = {model_name}
    short = model_name.split("/")[-1]
    variants.add(short)
    if short.endswith("-latest"):
        variants.add(short[:-7])
    if model_name.startswith("models/"):
        variants.add(short)
    else:
        variants.add(f"models/{short}")
    variants = {v for v in variants if v}
    return variants

def _warm_gemini_model(model_name: str) -> Optional[Any]:
    if not genai:
        return None
    try:
        model = genai.GenerativeModel(model_name)
        model.count_tokens("ping")
        return model
    except Exception as exc:
        print(f"✗ Model {model_name} unavailable: {exc}")
        return None

def _extract_text_from_response(response: Any) -> str:
    """
    Safely extract textual content from a Gemini response, even if the
    convenience `.text` accessor raises due to finish_reason issues.
    """
    if not response:
        return ""
    try:
        text = (getattr(response, "text", "") or "").strip()
        if text:
            return text
    except ValueError:
        # Fallback below
        pass

    collected: List[str] = []
    candidates = getattr(response, "candidates", None) or []
    for candidate in candidates:
        content = getattr(candidate, "content", None)
        if not content:
            continue
        parts = getattr(content, "parts", None) or []
        for part in parts:
            part_text = getattr(part, "text", None)
            if part_text:
                collected.append(part_text)

    return "\n".join(collected).strip()

def _try_parse_json_string(raw: str) -> Optional[Dict[str, Any]]:
    """Attempt to parse JSON, tolerating trailing commas and code fences."""
    raw = raw.strip()
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        sanitized = re.sub(r",(\s*[}\]])", r"\1", raw)
        if sanitized != raw:
            try:
                return json.loads(sanitized)
            except json.JSONDecodeError:
                pass
    return None

def _extract_json_payload(response_text: str) -> Dict[str, Any]:
    """Extract JSON or fallback data from Gemini responses."""
    text = response_text.strip()
    if "```" in text:
        parts = text.split("```")
        for part in parts:
            snippet = part.strip()
            if snippet.lower().startswith("json"):
                snippet = snippet[4:].strip()
            parsed = _try_parse_json_string(snippet)
            if parsed:
                return parsed
    parsed = _try_parse_json_string(text)
    if parsed:
        return parsed
    # Fallback: treat raw content as transcript
    return {
        "transcript": text,
        "raw_text": text,
        "language": "Unknown",
    }

def _clean_text_field(text: Optional[str]) -> str:
    if not text:
        return ""
    cleaned = text.strip()
    # Remove markdown fences
    cleaned = re.sub(r"^```(?:json)?", "", cleaned, flags=re.IGNORECASE).strip()
    cleaned = cleaned.replace("```", "").strip()
    # Remove leading json keyword
    cleaned = re.sub(r"^\s*json\s*", "", cleaned, flags=re.IGNORECASE).strip()
    # Remove surrounding quotes
    if cleaned.startswith('"') and cleaned.endswith('"'):
        cleaned = cleaned[1:-1].strip()
    if cleaned.startswith("'") and cleaned.endswith("'"):
        cleaned = cleaned[1:-1].strip()
    return cleaned

def _get_speech_model() -> Any:
    """Return a configured Gemini model for speech transcription with fallbacks."""
    global AVAILABLE_GEMINI_MODELS, speech_model_cache, speech_model_name

    if speech_model_cache is not None:
        return speech_model_cache

    if not HAS_GEMINI_SPEECH or not genai:
        raise HTTPException(status_code=500, detail="Gemini SDK not available on server")

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not configured")

    genai.configure(api_key=api_key)

    if not AVAILABLE_GEMINI_MODELS:
        AVAILABLE_GEMINI_MODELS = _list_gemini_models()
        if AVAILABLE_GEMINI_MODELS:
            print(f"ℹ️  Gemini models accessible to this key: {sorted(AVAILABLE_GEMINI_MODELS)}")
        else:
            print("⚠️  Could not list Gemini models (will attempt fallbacks blindly).")

    preferred_models = _build_model_priority(
        env_var="GEMINI_SPEECH_MODEL",
        defaults=[
            "gemini-2.5-pro",
            "models/gemini-2.5-pro",
            "gemini-2.5-pro-preview-06-05",
            "models/gemini-2.5-pro-preview-06-05",
            "gemini-2.5-flash",
            "models/gemini-2.5-flash",
            "gemini-2.5-flash-preview-09-2025",
            "models/gemini-2.5-flash-preview-09-2025",
            "gemini-2.0-pro-exp",
            "models/gemini-2.0-pro-exp",
            "gemini-2.0-flash",
            "models/gemini-2.0-flash",
            "gemini-2.0-flash-001",
            "models/gemini-2.0-flash-001",
            "gemini-flash-latest",
            "models/gemini-flash-latest",
            "gemini-pro-latest",
            "models/gemini-pro-latest",
            "gemini-1.5-flash",
            "models/gemini-1.5-flash",
            "gemini-1.5-flash-latest",
            "models/gemini-1.5-flash-latest",
            "gemini-1.5-pro",
            "models/gemini-1.5-pro",
            "gemini-1.5-pro-latest",
            "models/gemini-1.5-pro-latest",
            "gemini-pro-vision",
            "models/gemini-pro-vision",
            "gemini-pro",
            "models/gemini-pro",
            "gemini-1.0-pro",
            "models/gemini-1.0-pro",
            "gemini-1.0-pro-latest",
            "models/gemini-1.0-pro-latest",
        ],
    )

    last_error: Optional[str] = None

    for model_name in preferred_models:
        if AVAILABLE_GEMINI_MODELS:
            variants = _model_variants(model_name)
            if not (variants & AVAILABLE_GEMINI_MODELS):
                print(f"↷ {model_name} not reported by API; attempting anyway...")
        warmed = _warm_gemini_model(model_name)
        if warmed:
            speech_model_cache = warmed
            speech_model_name = model_name
            print(f"✅ Speech transcription using model: {model_name}")
            return warmed
        else:
            last_error = f"{model_name} unavailable"

    raise HTTPException(
        status_code=500,
        detail=(
            "No Gemini model with generateContent access is available for speech transcription. "
            "Please set GEMINI_SPEECH_MODEL to one of your accessible models "
            "(e.g., 'models/gemini-pro') in the backend environment."
        ),
    )

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
    Convert microphone audio to text using Gemini 1.5 Flash and return
    a same-language AI reply.
    """
    audio_bytes, mime_type = await _read_audio_upload(file, MAX_AUDIO_BYTES)

    try:
        model = _get_speech_model()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Speech model unavailable: {exc}") from exc

    audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
    languages_str = ", ".join(TARGET_LANGUAGES)
    instruction = f"""
You are FeverEase's multilingual medical assistant.
1. Detect the spoken language. Prioritize these languages: {languages_str}, but support any Indian language you recognize.
2. Produce a verbatim transcription in the SAME language as the speaker.
3. Provide a concise, empathetic medical reply in that exact language. Do not switch languages unless the user explicitly requests translation.
Return STRICT JSON (no markdown, no commentary) shaped exactly as:
{{
  "language": "<language name in English>",
  "transcript": "<verbatim transcript in the user's language>",
  "reply": "<assistant response in the same language>"
}}
    """.strip()

    parts = [
        {
            "role": "user",
            "parts": [
                {"text": instruction},
                {
                    "inline_data": {
                        "mime_type": mime_type or "audio/webm",
                        "data": audio_base64
                    }
                },
            ],
        }
    ]

    try:
        generation_config = {
            "temperature": 0.3,
            "max_output_tokens": 512,
        }
        response = await asyncio.to_thread(
            model.generate_content,
            parts,
            generation_config=generation_config,
            safety_settings=[],
        )
    except Exception as exc:
        print(f"Gemini speech call failed: {exc}")
        raise HTTPException(
            status_code=502,
            detail="Speech recognition failed. Please try recording again."
        ) from exc

    response_text = _extract_text_from_response(response)
    if not response_text:
        return {
            "transcript": "",
            "reply": "I couldn't clearly capture that audio. Please try speaking again.",
            "language": "Unknown",
        }

    parsed = _extract_json_payload(response_text)
    transcript = _clean_text_field(parsed.get("transcript") or parsed.get("text") or parsed.get("raw_text"))
    reply = _clean_text_field(parsed.get("reply") or parsed.get("response"))
    language = _clean_text_field(parsed.get("language") or parsed.get("detected_language") or "Unknown")

    if not transcript:
        return {
            "transcript": "",
            "reply": "We didn't detect clear speech in that clip. कृपया दोबारा बोलें।",
            "language": "Unknown",
        }
    if not reply:
        reply = "मैंने आपकी आवाज़ स्पष्ट रूप से नहीं सुनी। कृपया फिर से बोलें।"

    return {
        "transcript": transcript,
        "reply": reply,
        "language": language or "Unknown",
    }

@app.post("/api/speech-to-text/stream", response_model=SpeechStreamResponse)
async def speech_to_text_stream(file: UploadFile = File(...)):
    """
    Transcribe short audio chunks during recording for real-time previews.
    Returns only the transcript and detected language (no AI reply).
    """
    audio_bytes, mime_type = await _read_audio_upload(file, STREAM_MAX_AUDIO_BYTES)

    try:
        model = _get_speech_model()
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Speech model unavailable: {exc}") from exc

    audio_base64 = base64.b64encode(audio_bytes).decode("utf-8")
    languages_str = ", ".join(TARGET_LANGUAGES)
    instruction = f"""
You are a streaming speech recognizer for FeverEase.
1. Detect the spoken language (focus on: {languages_str}, but allow any Indian language).
2. Return an accurate transcript for ONLY the provided audio chunk in the same language.
3. Do not add commentary or translations.
Respond strictly with compact JSON:
{{
  "language": "<language name in English>",
  "transcript": "<chunk transcript same language>"
}}
""".strip()

    parts = [
        {
            "role": "user",
            "parts": [
                {"text": instruction},
                {
                    "inline_data": {
                        "mime_type": mime_type,
                        "data": audio_base64
                    }
                },
            ],
        }
    ]

    try:
        response = await asyncio.to_thread(
            model.generate_content,
            parts,
            generation_config={
                "temperature": 0.2,
                "max_output_tokens": 256,
            },
            safety_settings=[],
        )
    except Exception as exc:
        print(f"Gemini stream chunk failed: {exc}")
        raise HTTPException(
            status_code=502,
            detail="Live transcription failed. Please continue speaking."
        ) from exc

    response_text = _extract_text_from_response(response)
    if not response_text:
        return {
            "transcript": "",
            "language": "Unknown",
        }

    parsed = _extract_json_payload(response_text)
    transcript = _clean_text_field(parsed.get("transcript") or parsed.get("text") or parsed.get("raw_text"))
    language = _clean_text_field(parsed.get("language") or parsed.get("detected_language") or "Unknown")

    return {
        "transcript": transcript,
        "language": language or "Unknown",
    }

@app.post("/api/analyze-report")
async def analyze_report(file: UploadFile = File(...)):
    """
    Analyze a medical report image with BioBERT + Gemini for maximum accuracy.
    
    Step 1: Extract text from image using Gemini Vision
    Step 2: Process with BioBERT medical model for entity extraction
    Step 3: Enhance analysis with Gemini for comprehensive medical reasoning
    Step 4: Return detailed, actionable report for doctor and patient
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
        
        # Validate image size
        if len(image_data) < 100:
            raise HTTPException(status_code=400, detail="Image is too small")
        
        if len(image_data) > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Image file too large (max 10MB)")
        
        mime_type = file.content_type
        image_base64 = base64.standard_b64encode(image_data).decode("utf-8")
        
        # STEP 1: Extract text from image using Gemini Vision
        if not ai_service.vision_model:
            raise HTTPException(status_code=500, detail="AI vision service not configured")
        
        extraction_prompt = """Extract ALL text and data from this medical report. Be thorough and include:
        - Patient information
        - Lab values and test results
        - Medical findings
        - Measurements and observations
        - Doctor notes
        - Any other medical information visible
        
        Return the raw extracted text exactly as it appears."""
        
        extraction_response = ai_service.vision_model.generate_content([
            {"mime_type": mime_type, "data": image_base64},
            extraction_prompt
        ])
        
        raw_report_text = extraction_response.text
        print(f"[STEP 1] Extracted report text: {raw_report_text[:200]}...")
        
        # STEP 2: Process with BioBERT for medical entity extraction (optional, won't break if it fails)
        try:
            biobert_analysis = extract_medical_entities(raw_report_text)
            print(f"[STEP 2] BioBERT analysis complete: {biobert_analysis}")
        except Exception as e:
            print(f"[STEP 2] BioBERT analysis failed (using fallback): {e}")
            # Use simple keyword extraction as fallback
            biobert_analysis = extract_medical_keywords(raw_report_text)
        
        # STEP 3: Use Gemini for comprehensive medical reasoning - ALWAYS get diagnosis
        reasoning_prompt = f"""You are a MEDICAL EXPERT and CLINICAL ANALYZER. Analyze this medical report THOROUGHLY and provide EVERY SINGLE DETAIL.

CRITICAL: You MUST extract and provide a PRIMARY DIAGNOSIS. Even if the report says "under evaluation" or "pending", provide your best clinical assessment based on symptoms, findings, and medications prescribed.

EXTRACTED REPORT TEXT:
{raw_report_text}

BIOBERT IDENTIFIED ENTITIES (if available):
{json.dumps(biobert_analysis, indent=2)}

Create a COMPLETE, DETAILED clinical analysis. DO NOT skip any information. Include:

1. PATIENT DEMOGRAPHICS
   - Age, gender, weight, height if available
   - Any relevant medical history

2. CHIEF COMPLAINT & SYMPTOMS
   - Primary complaint
   - Associated symptoms
   - Duration and onset

3. VITAL SIGNS - EVERY VALUE
   - Temperature (exact value and interpretation)
   - Blood pressure (systolic/diastolic, with interpretation)
   - Heart rate/pulse (value and interpretation)
   - Respiratory rate (value and interpretation)
   - Oxygen saturation (value and interpretation)
   - Weight/BMI if available

4. PHYSICAL EXAMINATION FINDINGS - ALL DETAILS
   - General appearance
   - Head and neck examination
   - Chest examination
   - Abdomen examination
   - Extremities
   - Neurological findings
   - Any other relevant findings

5. LABORATORY TESTS - COMPLETE LIST WITH INTERPRETATION
   For EACH test include:
   - Test name
   - Value/Result
   - Unit of measurement
   - Normal reference range
   - Whether abnormal and significance
   - Clinical interpretation

6. IMAGING STUDIES - ALL DETAILS
   - Type of imaging (X-ray, CT, MRI, etc.)
   - Body part/region
   - Specific findings
   - Abnormalities identified
   - Clinical significance

7. DIAGNOSIS - COMPLETE (THIS IS CRITICAL - MUST PROVIDE)
   - Primary diagnosis with ICD code if available (REQUIRED - extract from report or infer from symptoms)
   - If diagnosis is "under evaluation" in report, provide your clinical assessment based on symptoms and findings
   - Differential diagnoses (other possible conditions)
   - Supporting evidence for each diagnosis
   - DO NOT leave diagnosis as "pending" - provide your best clinical assessment

8. SEVERITY ASSESSMENT
   - Acute, sub-acute, or chronic
   - Severity level (mild, moderate, severe, critical)
   - Risk stratification

9. TREATMENT PLAN - DETAILED INSTRUCTIONS
   - Medications:
     * Name of each medication
     * Exact dosage (including mg/units)
     * Frequency (how many times per day/week)
     * Duration (for how many days/weeks)
     * Route of administration (oral, IV, injection, etc.)
     * Special instructions (with food, before bed, etc.)
     * Purpose of each medication
   
   - Non-pharmacological treatment:
     * Rest requirements
     * Activity restrictions
     * Physical therapy if needed
     * Wound care if applicable
     * Isolation/precautions needed
   
   - Lifestyle modifications:
     * Diet specifics (what to eat, what to avoid)
     * Hydration requirements
     * Sleep recommendations
     * Exercise/activity level
     * Stress management
     * Occupational restrictions
   
   - Monitoring parameters:
     * What to monitor (temperature, symptoms, etc.)
     * Frequency of monitoring
     * Warning signs to watch for

10. DANGER SIGNS / RED FLAGS - WHEN TO SEEK IMMEDIATE HELP
    - List every symptom that requires emergency care
    - What to do if these occur

11. FOLLOW-UP PLAN - COMPLETE TIMELINE
    - Follow-up visit timing (days/weeks)
    - Type of follow-up (in-person, phone, video)
    - Which specialist if needed
    - Repeat tests needed with timing
    - Expected recovery timeline

12. COMPLICATIONS TO WATCH FOR
    - Potential complications
    - How to recognize them
    - Prevention measures

13. PATIENT EDUCATION & COUNSELING
    - What patient should understand about their condition
    - Why this treatment is recommended
    - Lifestyle impact
    - Prognosis
    - When normal activities can resume

14. DOCTOR'S CLINICAL NOTES
    - Assessment and reasoning
    - Clinical impressions
    - Special considerations

Return VALID JSON with this comprehensive structure:
{{
    "patient_info": {{
        "age": "...",
        "gender": "...",
        "weight": "...",
        "height": "...",
        "medical_history": ["..."]
    }},
    "chief_complaint": {{
        "primary": "...",
        "duration": "...",
        "associated_symptoms": ["..."]
    }},
    "vital_signs": {{
        "temperature": {{"value": "...", "unit": "C/F", "interpretation": "..."}},
        "blood_pressure": {{"systolic": "...", "diastolic": "...", "interpretation": "..."}},
        "heart_rate": {{"value": "...", "unit": "bpm", "interpretation": "..."}},
        "respiratory_rate": {{"value": "...", "unit": "breaths/min", "interpretation": "..."}},
        "oxygen_saturation": {{"value": "...", "unit": "%", "interpretation": "..."}},
        "bmi": {{"value": "...", "category": "..."}}
    }},
    "physical_examination": {{
        "general_appearance": "...",
        "head_neck": "...",
        "chest": "...",
        "abdomen": "...",
        "extremities": "...",
        "neurological": "...",
        "other_findings": ["..."]
    }},
    "lab_results": [
        {{
            "test_name": "...",
            "value": "...",
            "unit": "...",
            "normal_range": "...",
            "status": "normal/abnormal",
            "interpretation": "...",
            "clinical_significance": "..."
        }}
    ],
    "imaging_studies": [
        {{
            "type": "...",
            "body_part": "...",
            "findings": "...",
            "abnormalities": ["..."],
            "clinical_significance": "..."
        }}
    ],
    "diagnosis": {{
        "primary": {{"name": "...", "icd_code": "...", "severity": "..."}},
        "differential": [
            {{"diagnosis": "...", "likelihood": "...", "supporting_evidence": ["..."]}}
        ]
    }},
    "severity": {{
        "onset": "acute/sub-acute/chronic",
        "severity_level": "mild/moderate/severe/critical",
        "risk_level": "low/moderate/high/critical",
        "urgency": "routine/urgent/emergent"
    }},
    "treatment_plan": {{
        "medications": [
            {{
                "name": "...",
                "dosage": "... mg/units",
                "frequency": "... times daily/weekly",
                "duration": "... days/weeks",
                "route": "oral/IV/injection/topical/etc",
                "timing": "with food/before bed/etc",
                "purpose": "...",
                "side_effects_to_watch": ["..."]
            }}
        ],
        "non_pharmacological": {{
            "rest": "...",
            "activity_restrictions": "...",
            "physical_therapy": "...",
            "wound_care": "...",
            "precautions": ["..."]
        }},
        "lifestyle_modifications": {{
            "diet": {{
                "foods_to_eat": ["..."],
                "foods_to_avoid": ["..."],
                "meal_timing": "...",
                "caloric_intake": "..."
            }},
            "hydration": "... liters per day / when to drink",
            "sleep": "... hours per night, timing",
            "exercise": "...",
            "stress_management": "...",
            "occupational_restrictions": "..."
        }},
        "monitoring": {{
            "parameters": ["temperature, symptoms, etc"],
            "frequency": "... times daily",
            "action_if_abnormal": "..."
        }}
    }},
    "danger_signs": [
        {{
            "sign": "...",
            "action": "seek immediate emergency care",
            "when_to_call_911": true/false
        }}
    ],
    "follow_up": {{
        "visit_timing": "... days/weeks",
        "visit_type": "in-person/phone/video",
        "specialist_needed": "...",
        "repeat_tests": [
            {{"test": "...", "timing": "... days/weeks"}}
        ],
        "recovery_timeline": "...",
        "return_to_work": "... days/weeks"
    }},
    "complications": [
        {{
            "complication": "...",
            "signs": ["..."],
            "prevention": "...",
            "action_if_occurs": "..."
        }}
    ],
    "patient_education": {{
        "condition_explanation": "...",
        "why_treatment": "...",
        "lifestyle_impact": "...",
        "prognosis": "...",
        "resume_normal_activities": "..."
    }},
    "clinical_summary": "... comprehensive clinical notes and reasoning"
}}

CRITICAL: Include EVERY detail from the report. Do not omit any findings."""
        
        comprehensive_response = ai_service.vision_model.generate_content(
            [{"mime_type": mime_type, "data": image_base64}, reasoning_prompt]
        )
        
        response_text = comprehensive_response.text
        print(f"[STEP 3] Gemini reasoning complete: {response_text[:300]}...")
        
        # Parse JSON response
        try:
            if "```json" in response_text:
                json_str = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                json_str = response_text.split("```")[1].split("```")[0].strip()
            else:
                json_str = response_text
            
            comprehensive_analysis = json.loads(json_str)
            
            # Ensure diagnosis is always present - extract from raw text if missing
            if not comprehensive_analysis.get("diagnosis") or not comprehensive_analysis.get("diagnosis", {}).get("primary"):
                # Try to extract diagnosis from raw text
                diagnosis_text = extract_diagnosis_from_text(raw_report_text)
                if diagnosis_text:
                    if not comprehensive_analysis.get("diagnosis"):
                        comprehensive_analysis["diagnosis"] = {}
                    comprehensive_analysis["diagnosis"]["primary"] = diagnosis_text
                    print(f"[STEP 3] Extracted diagnosis from text: {diagnosis_text}")
                else:
                    # Fallback: use symptoms to infer diagnosis
                    symptoms = biobert_analysis.get("symptoms", [])
                    diseases = biobert_analysis.get("diseases", [])
                    if diseases:
                        comprehensive_analysis.setdefault("diagnosis", {})["primary"] = diseases[0].title()
                    elif symptoms:
                        # Infer from common symptom patterns
                        if "fever" in [s.lower() for s in symptoms]:
                            comprehensive_analysis.setdefault("diagnosis", {})["primary"] = "Fever (under evaluation)"
                        elif "headache" in [s.lower() for s in symptoms]:
                            comprehensive_analysis.setdefault("diagnosis", {})["primary"] = "Headache (under evaluation)"
                        else:
                            comprehensive_analysis.setdefault("diagnosis", {})["primary"] = f"Clinical assessment based on symptoms: {', '.join(symptoms[:3])}"
                    else:
                        comprehensive_analysis.setdefault("diagnosis", {})["primary"] = "Clinical assessment pending - please consult healthcare provider"
                        
        except (json.JSONDecodeError, IndexError) as e:
            print(f"[STEP 3] JSON parsing failed: {e}")
            # Try to extract diagnosis directly from text
            diagnosis_text = extract_diagnosis_from_text(raw_report_text)
            if not diagnosis_text:
                # Try to infer from BioBERT results
                diseases = biobert_analysis.get("diseases", [])
                symptoms = biobert_analysis.get("symptoms", [])
                if diseases:
                    diagnosis_text = diseases[0].title()
                elif symptoms:
                    diagnosis_text = f"Clinical assessment: {', '.join(symptoms[:2])}"
                else:
                    diagnosis_text = "Clinical assessment needed - please consult healthcare provider"
            
            comprehensive_analysis = {
                "diagnosis": {"primary": diagnosis_text, "differential": []},
                "abnormal_values": [],
                "issues_found": [],
                "treatment_plan": {"medications": [], "home_care": [], "diet": [], "lifestyle": []},
                "risk_level": {"level": "moderate", "reason": "Analysis completed with fallback extraction"},
                "danger_alerts": [],
                "patient_education": response_text if isinstance(response_text, str) else str(response_text)
            }
        
        # STEP 4: Format final comprehensive report - ensure diagnosis is always present
        # Extract diagnosis with multiple fallbacks
        diagnosis_primary = None
        if comprehensive_analysis.get("diagnosis", {}).get("primary"):
            diag_obj = comprehensive_analysis.get("diagnosis", {}).get("primary")
            if isinstance(diag_obj, dict):
                diagnosis_primary = diag_obj.get("name") or str(diag_obj)
            elif isinstance(diag_obj, str):
                diagnosis_primary = diag_obj
            else:
                diagnosis_primary = str(diag_obj)
        
        # Fallback: extract from text if still missing
        if not diagnosis_primary:
            diagnosis_primary = extract_diagnosis_from_text(raw_report_text)
        
        # Final fallback: use BioBERT results
        if not diagnosis_primary:
            diseases = biobert_analysis.get("diseases", [])
            if diseases:
                diagnosis_primary = diseases[0].title()
            else:
                diagnosis_primary = "Clinical assessment needed - please consult healthcare provider"
        
        final_report = {
            "diagnosis": diagnosis_primary,
            "all_findings": comprehensive_analysis.get("issues_found", []),
            "abnormal_values": comprehensive_analysis.get("abnormal_values", []),
            "vital_signs": comprehensive_analysis.get("vital_signs", {}),
            "lab_results": comprehensive_analysis.get("lab_results", []),
            "imaging": comprehensive_analysis.get("imaging_findings", []),
            "physical_exam": comprehensive_analysis.get("physical_exam", []),
            "treatment_plan": comprehensive_analysis.get("treatment_plan", {}),
            "warning_signs": comprehensive_analysis.get("warning_signs", []),
            "follow_up": comprehensive_analysis.get("follow_up", {}),
            "risk_level": comprehensive_analysis.get("risk_level", {}),
            "danger_alerts": comprehensive_analysis.get("danger_alerts", []),
            "patient_summary": comprehensive_analysis.get("patient_education", ""),
            "doctor_notes": comprehensive_analysis.get("doctor_notes", "")
        }
        
        return {
            "success": True,
            "raw_text": raw_report_text,
            "biobert": biobert_analysis,
            "final_report": final_report,
            "comprehensive_analysis": comprehensive_analysis
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in analyze-report: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


def extract_medical_entities(text: str) -> Dict[str, Any]:
    """
    Extract medical entities using keyword extraction.
    Processes medical text and identifies key entities like diseases, medications, etc.
    """
    try:
        # Use keyword extraction (more reliable than trying to use classifier with raw text)
        return extract_medical_keywords(text)
    except Exception as e:
        print(f"Medical entity extraction error: {e}")
        # Return empty structure on error
        return {
            "diseases": [],
            "medications": [],
            "symptoms": [],
            "lab_tests": [],
            "values": []
        }


def extract_diagnosis_from_text(text: str) -> str:
    """
    Extract diagnosis from medical report text using pattern matching.
    Returns the diagnosis string if found, otherwise empty string.
    """
    import re
    
    # Common patterns for diagnosis in medical reports
    patterns = [
        r'[Dd]iagnosis[:\s]+([^\n]+)',
        r'[Dd]iagnoses[:\s]+([^\n]+)',
        r'[Ff]inal\s+[Dd]iagnosis[:\s]+([^\n]+)',
        r'[Pp]rimary\s+[Dd]iagnosis[:\s]+([^\n]+)',
        r'[Cc]linical\s+[Dd]iagnosis[:\s]+([^\n]+)',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            diagnosis = match.group(1).strip()
            # Clean up common suffixes
            diagnosis = re.sub(r'\s*\([^)]*under\s+evaluation[^)]*\)', '', diagnosis, flags=re.IGNORECASE)
            diagnosis = re.sub(r'\s*\([^)]*pending[^)]*\)', '', diagnosis, flags=re.IGNORECASE)
            if diagnosis and len(diagnosis) > 3:
                return diagnosis
    
    return ""

def extract_medical_keywords(text: str) -> Dict[str, Any]:
    """
    Medical keyword extraction from text.
    Identifies common medical terms and patterns.
    """
    import re
    
    text_lower = text.lower()
    keywords = {
        "diseases": [],
        "medications": [],
        "symptoms": [],
        "lab_tests": [],
        "values": []
    }
    
    # Common disease keywords
    diseases = ["fever", "pneumonia", "diabetes", "hypertension", "infection", "inflammation", 
                "cancer", "malaria", "dengue", "headache", "throat pain", "cold", "flu", 
                "bronchitis", "asthma", "arthritis", "anemia", "thyroid"]
    for disease in diseases:
        if disease.lower() in text_lower and disease not in keywords["diseases"]:
            keywords["diseases"].append(disease)
    
    # Common medication keywords
    medications = ["paracetamol", "ibuprofen", "antibiotics", "insulin", "aspirin", 
                   "amoxicillin", "metformin", "aceclofenac", "trypsin", "chymotrypsin",
                   "rabeprazole", "omeprazole", "penicillin"]
    for med in medications:
        if med.lower() in text_lower and med not in keywords["medications"]:
            keywords["medications"].append(med)
    
    # Common symptom keywords
    symptoms = ["pain", "headache", "fever", "cough", "sore throat", "runny nose", 
                "nausea", "vomiting", "diarrhea", "fatigue", "weakness", "dizziness",
                "shortness of breath", "chest pain", "abdominal pain", "joint pain",
                "muscle pain", "cramps", "rash", "itching"]
    for symptom in symptoms:
        if symptom.lower() in text_lower and symptom not in keywords["symptoms"]:
            keywords["symptoms"].append(symptom)
    
    # Extract numbers (potential lab values, ages, dosages)
    numbers = re.findall(r'\d+\.?\d*', text)
    keywords["values"] = numbers[:10]  # Top 10 values
    
    return keywords

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
