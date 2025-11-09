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
    def __init__(self):
        self.knowledge_base = MedicalKnowledgeBase()
        self.model = None
        
        # Try to configure Gemini if available
        if HAS_GEMINI:
            api_key = os.getenv('GEMINI_API_KEY')
            if api_key:
                genai.configure(api_key=api_key)
                self.model = self._initialize_gemini_model()
            else:
                print("Warning: GEMINI_API_KEY not set. AI features will be limited.")
    
    def _initialize_gemini_model(self):
        """Initialize Gemini model with gemini-pro model"""
        try:
            print("🔍 Initializing Gemini model...")
            model = genai.GenerativeModel('gemini-pro')
            print("✅ Successfully initialized Gemini AI model")
            return model
        except Exception as e:
            print(f"❌ Failed to initialize Gemini model: {str(e)}")
            return None
        except Exception as e:
            print(f"⚠️  Could not list models from API: {e}")
            print("🔄 Falling back to hardcoded model names...")
        
        # FALLBACK: Try hardcoded model names if listing failed
        fallback_models = [
            'gemini-1.5-flash',
            'gemini-1.5-pro', 
            'gemini-pro',
            'gemini-2.0-flash-exp',
        ]
        
        for model_name in fallback_models:
            try:
                print(f"🔄 Trying fallback model: {model_name}")
                model = genai.GenerativeModel(model_name)
                print(f"✅ Successfully initialized AI service model: {model_name}")
                return model
            except Exception as e:
                print(f"✗ Failed to initialize {model_name}: {str(e)[:150]}")
                continue
        
        print("❌ Could not initialize any Gemini model for AI service")
        return None
                
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
