import os
from typing import List, Dict, Any
from .medical_knowledge import MedicalKnowledgeBase

try:
    import google.generativeai as genai
    HAS_GEMINI = True
except ImportError:
    print("Warning: google.generativeai not found. Some AI features will be limited.")
    HAS_GEMINI = False

class AIService:
    """Core service that orchestrates all AI-powered experiences."""

    DEFAULT_TEXT_MODELS = [
        "gemini-pro",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-2.0-flash-exp",
    ]

    DEFAULT_VISION_MODELS = [
        "gemini-pro-vision",
        "gemini-1.0-pro-vision-001",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-1.5-flash-latest",
        "gemini-2.0-flash-exp",
    ]

    def __init__(self):
        self.knowledge_base = MedicalKnowledgeBase()
        self.model = None
        self.vision_model = None  # For image analysis
        self.available_models: List[str] = []
        
        # Try to configure Gemini if available
        if HAS_GEMINI:
            api_key = os.getenv('GEMINI_API_KEY')
            if api_key:
                genai.configure(api_key=api_key)
                self.available_models = self._list_available_models()
                self.model = self._initialize_gemini_model()
                self.vision_model = self._initialize_vision_model()
            else:
                print("Warning: GEMINI_API_KEY not set. AI features will be limited.")
    
    def _initialize_gemini_model(self):
        """Initialize the default text model with sensible fallbacks."""
        preferred = os.getenv("GEMINI_TEXT_MODEL")
        candidates = self._prepare_model_candidates(preferred, self.DEFAULT_TEXT_MODELS)
        model = self._try_initialize_model("text", candidates)
        if not model:
            print("❌ Could not initialize any Gemini text model")
        return model
    
    def _initialize_vision_model(self):
        """Initialize a vision-capable Gemini model for image analysis."""
        preferred = os.getenv("GEMINI_VISION_MODEL")
        candidates = self._prepare_model_candidates(preferred, self.DEFAULT_VISION_MODELS)
        model = self._try_initialize_model("vision", candidates)
        if model:
            return model
        print("⚠️  Could not initialize any dedicated vision model")
        return None

    def _prepare_model_candidates(self, configured: Any, defaults: List[str]) -> List[str]:
        """Build a de-duplicated list of model names to attempt."""
        candidates: List[str] = []
        seen = set()
        for name in [configured, *defaults]:
            if not name:
                continue
            normalized = str(name).strip()
            if normalized.startswith("models/"):
                normalized = normalized.split("/", 1)[1]
            if normalized and normalized not in seen:
                seen.add(normalized)
                candidates.append(normalized)
        return candidates

    def _is_model_available(self, model_name: str) -> bool:
        """Check whether the current API key exposes the requested model."""
        if not self.available_models:
            return True  # list_models failed; optimistically try everything
        normalized = model_name.split("/")[-1]
        return any(entry.endswith(normalized) for entry in self.available_models)

    def _try_initialize_model(self, purpose: str, candidates: List[str]):
        """Try instantiating the first candidate that is available."""
        for model_name in candidates:
            if not self._is_model_available(model_name):
                print(f"⏭️  Skipping {purpose} model {model_name} (not enabled for this API key)")
                continue
            try:
                print(f"🔄 Trying {purpose} model: {model_name}")
                model = genai.GenerativeModel(model_name)
                print(f"✅ Successfully initialized {purpose} model: {model_name}")
                return model
            except Exception as e:
                print(f"✗ Failed to initialize {purpose} model {model_name}: {str(e)[:200]}")
        return None

    def _list_available_models(self) -> List[str]:
        """Fetch the list of models the current API key can access."""
        try:
            models = list(genai.list_models())
            available = [
                model.name for model in models
                if "generateContent" in getattr(model, "supported_generation_methods", [])
                or "generate_content" in getattr(model, "supported_generation_methods", [])
            ]
            if available:
                preview = ", ".join(entry.split("/")[-1] for entry in available[:5])
                print(f"ℹ️ Gemini models enabled for this key: {preview}{'...' if len(available) > 5 else ''}")
            else:
                print("⚠️ list_models returned no entries with generateContent")
            return available
        except Exception as e:
            print(f"⚠️  Could not list models from API: {e}")
            return []
                
    async def analyze_symptoms(self, symptoms: List[str], patient_info: Dict[str, Any]) -> Dict[str, Any]:
        """
        Analyze symptoms using both local knowledge base and Gemini Pro if available
        """
        # Get analysis from knowledge base
        possible_diseases = self.knowledge_base.get_diseases_for_symptoms(symptoms)
        severity = self.knowledge_base.get_severity_assessment(symptoms)
        emergency = self.knowledge_base.get_emergency_assessment(symptoms, patient_info)
        precautions = self.knowledge_base.get_precautions(symptoms, list(possible_diseases.keys()))
        treatment_recs = self.knowledge_base.get_treatment_recommendations(
            symptoms, 
            list(possible_diseases.keys()),
            severity['average_severity'],
            emergency['is_emergency']
        )
        relevant_cases = self.knowledge_base.get_relevant_cases(symptoms, patient_info)
        
        # If Gemini is available, enhance the analysis
        ai_refinements = None
        if self.model:
            try:
                prompt = f"""Based on the following analysis:
                Symptoms: {', '.join(symptoms)}
                Patient information: {patient_info}
                Possible diseases identified: {list(possible_diseases.keys())}
                Severity assessment: {severity['average_severity']} out of 10
                Emergency assessment: {'Yes' if emergency['is_emergency'] else 'No'}
                Similar historical cases: {len(relevant_cases)} found
                
                Please provide a comprehensive medical assessment using this information.
                Consider the following in your response:
                1. Verify and refine the disease predictions
                2. Assess the severity and urgency
                3. Validate or enhance the precautions: {precautions}
                4. Add to these treatment recommendations: {treatment_recs}
                
                Use the following format for the response:
                {{
                    "refined_conditions": ["condition1", "condition2"],
                    "urgency_level": "low/medium/high",
                    "additional_recommendations": ["recommendation1", "recommendation2"],
                    "seek_immediate_care": true/false,
                    "specialist_referral": ["specialist1", "specialist2"] if needed,
                    "follow_up_timing": "immediate/24 hours/1 week/etc"
                }}
                """
                
                response = await self.model.generate_content_async(prompt)
                ai_refinements = eval(response.text)
            except Exception as e:
                print(f"Warning: Could not get AI refinements: {e}")
        
        # Return combined analysis
        return {
            "knowledge_base_analysis": {
                "possible_diseases": possible_diseases,
                "severity_assessment": severity,
                "emergency_assessment": emergency,
                "base_recommendations": treatment_recs,
                "precautions": precautions
            },
            "ai_analysis": ai_refinements,
            "combined_recommendations": list(set(treatment_recs + 
                (ai_refinements.get("additional_recommendations", []) if ai_refinements else [])
            )),
            "seek_immediate_care": emergency['is_emergency'] or 
                                (ai_refinements.get("seek_immediate_care", False) if ai_refinements else False)
        }
    
    async def get_medicine_info(self, medicine_name: str) -> Dict[str, Any]:
        """
        Get detailed information about a medicine using both knowledge base and Gemini Pro
        """
        # First check our knowledge base
        kb_info = self.knowledge_base.get_medicine_info(medicine_name)
        
        # If Gemini is available, enhance the information
        ai_info = None
        if self.model:
            try:
                prompt = f"""Please provide detailed information about {medicine_name}.
                
                {'Here is what we know from our database:' + str(kb_info) if kb_info else 'We need complete information about this medicine.'}
                
                Please verify, correct if needed, and expand upon this information using authoritative medical sources.
                Use the following format:
                {{
                    "name": "{medicine_name}",
                    "description": "",
                    "common_uses": [],
                    "side_effects": [],
                    "warnings": [],
                    "interactions": [],
                    "dosage_info": {{
                        "adult": "",
                        "child": "",
                        "elderly": ""
                    }},
                    "contraindications": [],
                    "storage_instructions": "",
                    "reference_sources": []
                }}
                """
                
                response = await self.model.generate_content_async(prompt)
                ai_info = eval(response.text)
            except Exception as e:
                print(f"Warning: Could not get AI medicine info: {e}")
                
        # Combine knowledge base and AI information if we have both
        if kb_info and ai_info:
            return {**kb_info, **ai_info}
        elif ai_info:
            return ai_info
        elif kb_info:
            return kb_info
        else:
            return {
                "error": "No information available",
                "message": "Could not find information about this medicine"
            }
