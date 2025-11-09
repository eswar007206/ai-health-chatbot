"""
Chat Service

This service handles the chat functionality using Gemini AI and our medical knowledge base.
It combines symptom analysis with natural language understanding, using all data from:
1. Knowledge Base (symptoms, diseases, medicines)
2. Decision Trees (triage, risk assessment, emergency markers)
3. Training Conversations (sample consultations, common questions)
"""

import os
from typing import Dict, List, Optional, Any
from pathlib import Path
from dotenv import load_dotenv
import numpy as np
from .symptom_analyzer import SymptomAnalyzer
from .medical_knowledge_base import MedicalKnowledgeBase

# Try to import model dependencies
try:
    import joblib
    from sentence_transformers import SentenceTransformer
    HAS_MODELS = True
except ImportError:
    print("Warning: Model dependencies not found. Trained models will not be used.")
    HAS_MODELS = False

# Try to import Gemini AI
try:
    import google.generativeai as genai
    HAS_GEMINI = True
except ImportError:
    print("Warning: Failed to import google.generativeai")
    HAS_GEMINI = False

# Load environment variables
load_dotenv()

# Configure Gemini AI if available
if HAS_GEMINI:
    api_key = os.getenv("GEMINI_API_KEY")
    if api_key:
        genai.configure(api_key=api_key)
        print(f"Successfully configured Gemini AI with key: {api_key[:5]}...")
    else:
        print("Warning: GEMINI_API_KEY not found in environment variables")
        HAS_GEMINI = False

class ChatService:
    def __init__(self):
        # Initialize knowledge base (loads all JSON data from 3 folders)
        try:
            self.knowledge_base = MedicalKnowledgeBase()
            print("✓ Knowledge base loaded successfully")
        except Exception as e:
            print(f"❌ Error loading knowledge base: {e}")
            import traceback
            traceback.print_exc()
            raise
        
        try:
            self.symptom_analyzer = SymptomAnalyzer()
            print("✓ Symptom analyzer initialized")
        except Exception as e:
            print(f"❌ Error initializing symptom analyzer: {e}")
            raise
        
        # Load trained models if available
        self.models_dir = Path(__file__).parent.parent.parent / 'models'
        self.disease_classifier = None
        self.severity_classifier = None
        self.emergency_classifier = None
        self.embedding_model = None
        self.symptom_embeddings = None
        self.disease_embeddings = None
        
        if HAS_MODELS:
            self._load_trained_models()
        
        # Initialize Gemini model if available
        if HAS_GEMINI:
            self.chat_model = self._initialize_gemini_model()
            if self.chat_model:
                print("ChatService initialized with Gemini AI, knowledge base, and trained models")
            else:
                print("ChatService initialized without Gemini AI (model initialization failed)")
        else:
            self.chat_model = None
            print("ChatService initialized without Gemini AI (will use knowledge base and models only)")
    
    def _initialize_gemini_model(self):
        """Try to initialize Gemini model by first listing available models, then using the best one"""
        # FIRST: Try to list available models from the API
        try:
            print("🔍 Listing available Gemini models from API...")
            available_models = genai.list_models()
            model_list = []
            for model in available_models:
                if 'generateContent' in model.supported_generation_methods:
                    model_name = model.name
                    # Extract just the model name (remove 'models/' prefix if present)
                    if '/' in model_name:
                        model_name = model_name.split('/')[-1]
                    model_list.append({
                        'full_name': model.name,
                        'short_name': model_name,
                        'model_obj': model
                    })
                    print(f"  ✓ Found: {model.name} (short: {model_name})")
            
            if model_list:
                # Try models in order of preference
                preferred_order = ['gemini-pro', 'gemini-1.0-pro', 'gemini-1.0-pro-latest', 'gemini-pro-vision']
                
                for preferred in preferred_order:
                    for model_info in model_list:
                        if preferred in model_info['short_name'].lower() or preferred in model_info['full_name'].lower():
                            try:
                                print(f"🎯 Attempting to use preferred model: {model_info['full_name']}")
                                model_instance = genai.GenerativeModel(model_info['full_name'])
                                print(f"✅ Successfully initialized chat model: {model_info['full_name']}")
                                return model_instance
                            except Exception as e:
                                print(f"⚠️  Failed to initialize {model_info['full_name']}: {str(e)[:150]}")
                                continue
                
                # If preferred models didn't work, try the first available one
                for model_info in model_list:
                    try:
                        print(f"🎯 Attempting to use model: {model_info['full_name']}")
                        model_instance = genai.GenerativeModel(model_info['full_name'])
                        print(f"✅ Successfully initialized chat model: {model_info['full_name']}")
                        return model_instance
                    except Exception as e:
                        print(f"⚠️  Failed to initialize {model_info['full_name']}: {str(e)[:150]}")
                        continue
        except Exception as e:
            print(f"⚠️  Could not list models from API: {e}")
            print("🔄 Falling back to hardcoded model names...")
        
        # FALLBACK: Try hardcoded model names if listing failed
        fallback_models = [
            'gemini-pro',
            'gemini-1.0-pro',
            'gemini-1.0-pro-latest',
            'gemini-pro-vision'
        ]
        
        for model_name in fallback_models:
            try:
                print(f"🔄 Trying fallback model: {model_name}")
                model = genai.GenerativeModel(model_name)
                print(f"✅ Successfully initialized chat model: {model_name}")
                return model
            except Exception as e:
                print(f"✗ Failed to initialize {model_name}: {str(e)[:150]}")
                continue
        
        print("❌ Could not initialize any Gemini model")
        return None
    
    def _load_trained_models(self):
        """Load trained models and embeddings"""
        try:
            # Load embedding model
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            
            # Load classifiers
            disease_model_path = self.models_dir / 'disease_classifier.joblib'
            severity_model_path = self.models_dir / 'severity_classifier.joblib'
            emergency_model_path = self.models_dir / 'emergency_classifier.joblib'
            
            if disease_model_path.exists():
                self.disease_classifier = joblib.load(disease_model_path)
                print("✓ Disease classifier loaded")
            
            if severity_model_path.exists():
                self.severity_classifier = joblib.load(severity_model_path)
                print("✓ Severity classifier loaded")
            
            if emergency_model_path.exists():
                self.emergency_classifier = joblib.load(emergency_model_path)
                print("✓ Emergency classifier loaded")
            
            # Load embeddings
            symptom_emb_path = self.models_dir / 'symptom_embeddings.npy'
            disease_emb_path = self.models_dir / 'disease_embeddings.npy'
            
            if symptom_emb_path.exists():
                self.symptom_embeddings = np.load(symptom_emb_path, allow_pickle=True).item()
                print("✓ Symptom embeddings loaded")
            
            if disease_emb_path.exists():
                self.disease_embeddings = np.load(disease_emb_path, allow_pickle=True).item()
                print("✓ Disease embeddings loaded")
                
        except Exception as e:
            print(f"Warning: Could not load some trained models: {e}")
            print("Continuing with knowledge base and Gemini only...")
        
        # System context for the AI
        self.system_context = """You are an AI medical assistant specialized in fever and related symptoms analysis. 
        Your role is to:
1. Help users understand their symptoms based on our comprehensive medical knowledge base AND trained ML models
2. Provide evidence-based medical information from our trained data and knowledge base
        3. Guide users on when to seek professional medical help
        4. Explain fever-related conditions clearly and accurately
5. Use the provided medical data (trained models + knowledge base) to give accurate, helpful responses
6. Handle ambiguous or unclear inputs by using your natural language understanding to clarify
        
        Important guidelines:
        - Always emphasize that you're an AI assistant, not a doctor
- Base your responses on BOTH the trained model predictions AND the medical knowledge base data provided
- When trained models make predictions, consider them along with knowledge base data
- If the user's input is unclear or ambiguous, use your understanding to ask clarifying questions or make reasonable inferences
- Recommend professional medical help when symptoms are severe or emergency markers are present
        - Be clear about emergency symptoms that require immediate attention
        - Provide context for your recommendations
        - Use simple, clear language
- Reference both the trained model predictions and knowledge base data when making recommendations
"""
            
    def _extract_symptoms_from_message(self, message: str) -> List[str]:
        """Extract symptoms using fast pattern matching (no API calls)"""
        common_symptoms = ['fever', 'headache', 'cough', 'nausea', 'vomiting', 
                         'diarrhea', 'fatigue', 'chills', 'body ache', 'sore throat',
                         'temperature', 'pain', 'ache', 'sweat', 'weakness', 'dizziness',
                         'rash', 'swelling', 'redness', 'itchy', 'burning']
        message_lower = message.lower()
        found = [s for s in common_symptoms if s in message_lower]
        return found
    
    def _extract_patient_info(self, message: str) -> Dict[str, Any]:
        """Extract patient info using regex (fast, no API calls)"""
        patient_info = {}
        import re
        
        # Extract temperature (handles Celsius and Fahrenheit)
        temp_patterns = [
            r'(\d+\.?\d*)\s*(?:degree|deg|°|f|F|c|C)',
            r'(\d+\.?\d*)\s*(?:fahrenheit|fahrenheit|celcius|celsius)',
            r'temp[erature]*\s*(?:of|is|:)?\s*(\d+\.?\d*)',
        ]
        for pattern in temp_patterns:
            temp_match = re.search(pattern, message, re.IGNORECASE)
            if temp_match:
                temp_value = float(temp_match.group(1))
                # If > 50, assume Celsius and convert to Fahrenheit
                if temp_value > 50 or 'c' in message.lower():
                    patient_info['temperature'] = (temp_value * 9/5) + 32
                else:
                    patient_info['temperature'] = temp_value
                break
        
        # Extract age
        age_patterns = [
            r'(\d+)\s*(?:year|yr|y\.o|years old|age)',
            r'age[:\s]*(\d+)',
        ]
        for pattern in age_patterns:
            age_match = re.search(pattern, message, re.IGNORECASE)
            if age_match:
                patient_info['age_years'] = int(age_match.group(1))
                break
        
        # Extract duration
        duration_patterns = [
            r'(\d+)\s*(?:hour|hr|h)',
            r'(\d+)\s*(?:day|days)',
            r'for\s*(\d+)\s*(?:hour|day)',
        ]
        for pattern in duration_patterns:
            duration_match = re.search(pattern, message, re.IGNORECASE)
            if duration_match:
                hours = int(duration_match.group(1))
                if 'day' in message.lower():
                    hours = hours * 24
                patient_info['duration_hours'] = hours
                break
        
        return patient_info
    
    def _predict_with_models(self, symptoms: List[str]) -> Dict[str, Any]:
        """Use trained models to make predictions"""
        predictions = {
            'disease_prediction': None,
            'severity_prediction': None,
            'emergency_prediction': None,
            'model_confidence': {}
        }
        
        if not self.embedding_model or not symptoms:
            return predictions
        
        try:
            # Create embedding for symptoms
            symptoms_text = ' '.join(symptoms)
            symptom_embedding = self.embedding_model.encode([symptoms_text])[0]
            
            # Disease prediction
            if self.disease_classifier:
                disease_pred = self.disease_classifier.predict([symptom_embedding])[0]
                # Get prediction probabilities
                if hasattr(self.disease_classifier, 'predict_proba'):
                    proba = self.disease_classifier.predict_proba([symptom_embedding])[0]
                    max_prob = max(proba)
                    predictions['disease_prediction'] = disease_pred
                    predictions['model_confidence']['disease'] = float(max_prob)
            
            # Severity prediction
            if self.severity_classifier:
                severity_pred = self.severity_classifier.predict([symptom_embedding])[0]
                predictions['severity_prediction'] = float(severity_pred)
                if hasattr(self.severity_classifier, 'predict_proba'):
                    proba = self.severity_classifier.predict_proba([symptom_embedding])[0]
                    max_prob = max(proba)
                    predictions['model_confidence']['severity'] = float(max_prob)
            
            # Emergency prediction
            if self.emergency_classifier:
                emergency_pred = self.emergency_classifier.predict([symptom_embedding])[0]
                predictions['emergency_prediction'] = bool(emergency_pred)
                if hasattr(self.emergency_classifier, 'predict_proba'):
                    proba = self.emergency_classifier.predict_proba([symptom_embedding])[0]
                    max_prob = max(proba)
                    predictions['model_confidence']['emergency'] = float(max_prob)
                    
        except Exception as e:
            print(f"Error in model prediction: {e}")
        
        return predictions
    
    def _build_comprehensive_context(self, message: str, symptoms: List[str], patient_info: Dict) -> str:
        """Build comprehensive context from all knowledge base data and trained models"""
        context_parts = []
        
        # Add system context
        context_parts.append(self.system_context)
        
        # Add knowledge base summary
        kb_summary = self.knowledge_base.get_all_knowledge_context()
        context_parts.append(f"\nAvailable Medical Knowledge: {kb_summary}")
        
        # If symptoms found, add detailed analysis
        if symptoms:
            # Get predictions from trained models
            model_predictions = self._predict_with_models(symptoms)
            if model_predictions.get('disease_prediction'):
                context_parts.append(f"\n🤖 Trained Model Predictions:")
                if model_predictions['disease_prediction']:
                    confidence = model_predictions['model_confidence'].get('disease', 0)
                    context_parts.append(f"- Predicted Disease: {model_predictions['disease_prediction']} (confidence: {confidence:.1%})")
                if model_predictions.get('severity_prediction'):
                    context_parts.append(f"- Predicted Severity: {model_predictions['severity_prediction']:.1f}/10")
                if model_predictions.get('emergency_prediction'):
                    context_parts.append(f"- Emergency Alert: {'YES' if model_predictions['emergency_prediction'] else 'NO'}")
            # Get disease predictions
            diseases = self.knowledge_base.get_diseases_for_symptoms(symptoms)
            if diseases:
                context_parts.append(f"\nPossible Conditions Based on Symptoms:")
                for disease, confidence in list(diseases.items())[:5]:  # Top 5
                    context_parts.append(f"- {disease} (confidence: {confidence:.1%})")
            
            # Get severity assessment
            severity = self.knowledge_base.get_severity_assessment(symptoms)
            context_parts.append(f"\nSeverity Assessment:")
            context_parts.append(f"- Average Severity: {severity.get('average_severity', 0):.1f}/10")
            context_parts.append(f"- Maximum Severity: {severity.get('max_severity', 0)}/10")
            
            # Get symptom descriptions
            symptom_descriptions = {}
            for symptom in symptoms:
                desc = self.knowledge_base.get_symptom_description(symptom)
                if desc:
                    symptom_descriptions[symptom] = desc
            
            if symptom_descriptions:
                context_parts.append(f"\nSymptom Descriptions:")
                for symptom, desc in symptom_descriptions.items():
                    context_parts.append(f"- {symptom}: {desc}")
            
            # Get precautions
            precautions = self.knowledge_base.get_precautions_for_symptoms(symptoms)
            if precautions:
                context_parts.append(f"\nRecommended Precautions:")
                for prec in precautions[:5]:  # Top 5
                    context_parts.append(f"- {prec}")
            
            # Apply decision trees
            decision_tree = self.knowledge_base.apply_decision_tree(symptoms, patient_info)
            if decision_tree:
                context_parts.append(f"\nMedical Protocol Analysis:")
                if decision_tree.get('triage_level'):
                    context_parts.append(f"- Triage Level: {decision_tree['triage_level']}")
                if decision_tree.get('risk_level'):
                    context_parts.append(f"- Risk Level: {decision_tree['risk_level']}")
                if decision_tree.get('emergency_status'):
                    context_parts.append(f"- EMERGENCY STATUS: {decision_tree['emergency_status']}")
            
            # Get similar cases
            similar_cases = self.knowledge_base.get_similar_cases(symptoms, patient_info)
            if similar_cases:
                context_parts.append(f"\nSimilar Cases from Training Data:")
                for i, case in enumerate(similar_cases[:3], 1):  # Top 3
                    complaint = case.get('initial_complaint', 'N/A')
                    recommendation = case.get('final_recommendation', 'N/A')
                    context_parts.append(f"Case {i}: {complaint} -> Recommendation: {recommendation}")
        
        # Add fever-specific analysis if temperature is present
        if patient_info.get('temperature'):
            fever_analysis = self.symptom_analyzer.analyze_fever(
                temperature=patient_info['temperature'],
                duration_hours=patient_info.get('duration_hours', 0),
                age_years=patient_info.get('age_years'),
                additional_symptoms=symptoms
            )
            if fever_analysis:
                context_parts.append(f"\nFever Analysis:")
                context_parts.append(f"- Severity: {fever_analysis.get('severity', 'unknown')}")
                if fever_analysis.get('warnings'):
                    context_parts.append(f"- Warnings: {', '.join(fever_analysis['warnings'])}")
                if fever_analysis.get('recommendations'):
                    context_parts.append(f"- Recommendations: {', '.join(fever_analysis['recommendations'][:3])}")
        
        # Add common questions if relevant (these are sample questions, not Q&A pairs)
        try:
            # Safely access common_questions
            if not hasattr(self.knowledge_base, 'common_questions'):
                # If knowledge_base doesn't have the attribute, skip
                common_questions_data = {}
            else:
                common_questions_data = getattr(self.knowledge_base, 'common_questions', {})
            
            # Handle JSON structure: {"common_questions": [...]}
            if isinstance(common_questions_data, dict):
                common_questions = common_questions_data.get('common_questions', [])
            elif isinstance(common_questions_data, list):
                common_questions = common_questions_data
            else:
                common_questions = []
            
            # These are sample questions from medical consultations, use them as context
            if common_questions and len(common_questions) > 0:
                # Find relevant questions based on keywords
                relevant_questions = []
                message_lower = message.lower()
                message_words = message_lower.split()[:5]
                
                for qa in common_questions[:20]:  # Check first 20
                    if isinstance(qa, dict):
                        question = qa.get('question', '').lower()
                        if question and any(word in question for word in message_words):
                            relevant_questions.append(qa.get('question', ''))
                            if len(relevant_questions) >= 2:
                                break
                
                if relevant_questions:
                    context_parts.append(f"\nRelevant Medical Questions (from training data):")
                    for q in relevant_questions[:2]:
                        context_parts.append(f"- {q}")
        except Exception as e:
            # Silently skip if common_questions structure is unexpected
            print(f"Note: Could not load common questions: {e}")
            pass
        
        return "\n".join(context_parts)
            
    async def process_message(self, message: str, chat_history: List[Dict] = None) -> Dict:
        """
        Process a user message and return an AI response using knowledge base and Gemini.
        
        Args:
            message: The user's message
            chat_history: List of previous messages (optional)
            
        Returns:
            Dict containing the response and any additional data
        """
        if not message or not isinstance(message, str):
            return {
                "response": "I apologize, but I received an invalid message format. Please try again with a text message.",
                "error": "Invalid message format"
            }

        try:
            if not self.chat_model:
                return {
                    "response": "I apologize, but the AI service is currently unavailable. Please try again later.",
                    "error": "Gemini AI not available"
                }

            # Extract symptoms and patient info from message (FAST - no API calls)
            symptoms = self._extract_symptoms_from_message(message)
            patient_info = self._extract_patient_info(message)
            
            # Get predictions from TRAINED MODELS (fast, local)
            model_predictions = {}
            if symptoms:
                try:
                    model_predictions = self._predict_with_models(symptoms)
                    if model_predictions:
                        print(f"🤖 Trained Model Predictions: {model_predictions}")
                except Exception as e:
                    print(f"⚠️ Model prediction error: {e}")
            
            # Get knowledge base data (with safe fallbacks)
            diseases = {}
            severity = {}
            emergency_info = {}
            precautions = []
            
            if symptoms:
                try:
                    diseases = self.knowledge_base.get_diseases_for_symptoms(symptoms) or {}
                except:
                    pass
                try:
                    severity = self.knowledge_base.get_severity_assessment(symptoms) or {}
                except:
                    pass
                try:
                    # Use decision tree for emergency assessment
                    decision_tree = self.knowledge_base.apply_decision_tree(symptoms, patient_info)
                    if decision_tree and decision_tree.get('emergency_status'):
                        emergency_info = {'is_emergency': 'emergency' in str(decision_tree.get('emergency_status', '')).lower()}
                except:
                    pass
                try:
                    precautions = self.knowledge_base.get_precautions_for_symptoms(symptoms) or []
                except:
                    pass
            
            # Build concise context (only if we have data - otherwise let Gemini handle it)
            context_sections = []
            
            # Trained model predictions
            if model_predictions and (model_predictions.get('disease_prediction') or model_predictions.get('severity_prediction')):
                context_sections.append("🤖 **TRAINED MODEL PREDICTIONS**:")
                if model_predictions.get('disease_prediction'):
                    conf = model_predictions.get('model_confidence', {}).get('disease', 0)
                    context_sections.append(f"- Disease: {model_predictions['disease_prediction']} ({conf:.0%} confidence)")
                if model_predictions.get('severity_prediction'):
                    context_sections.append(f"- Severity: {model_predictions['severity_prediction']:.1f}/10")
                if model_predictions.get('emergency_prediction'):
                    context_sections.append(f"- Emergency: {'YES' if model_predictions['emergency_prediction'] else 'NO'}")
            
            # Knowledge base data (only if available)
            if diseases or severity or emergency_info or precautions:
                context_sections.append("📚 **KNOWLEDGE BASE**:")
                if diseases:
                    top = list(diseases.items())[:2]
                    context_sections.append(f"- Conditions: {', '.join([d[0] for d in top])}")
                if severity.get('average_severity'):
                    context_sections.append(f"- Severity: {severity['average_severity']:.1f}/10")
                if emergency_info.get('is_emergency'):
                    context_sections.append("- ⚠️ EMERGENCY")
                if precautions:
                    context_sections.append(f"- Precautions: {', '.join(precautions[:2])}")
            
            # Build concise prompt - if no local data, rely on Gemini
            if context_sections:
                context_text = "\n".join(context_sections)
                prompt = f"""You are FeverEase, a medical AI assistant. Use the following data from our trained models and knowledge base, BUT if this data is limited or missing, use your extensive medical knowledge to provide the best answer.

{context_text}

**User Message**: "{message}"
**Symptoms**: {', '.join(symptoms) if symptoms else 'None detected'}
**Patient Info**: {patient_info if patient_info else 'Not provided'}

Provide a clear, helpful response in this format:

1. **Analysis**: Brief analysis of symptoms and condition based on the data and your knowledge
2. **Recommendations**: Clear actionable steps or advice
3. **Important Notes**: Any warnings, precautions, or important information
4. **When to Seek Medical Care**: Clear guidance on when to see a doctor

Keep each section concise and easy to understand. If using trained model predictions, mention them. Always include a reminder that you're an AI assistant."""
            else:
                prompt = f"""You are a medical AI assistant helping with health questions.

**User Message**: "{message}"
**Symptoms Detected**: {', '.join(symptoms) if symptoms else 'None'}
**Patient Details**: {patient_info if patient_info else 'Not provided'}

Provide a helpful, accurate medical response. Use your extensive medical knowledge. 
Be clear, concise, and always remind: 'I'm an AI assistant, not a doctor. 
Consult a healthcare professional for serious symptoms.'"""

            
            # Add chat history if available (concise)
            if chat_history:
                recent = "\n".join([f"{m.get('role', 'user')}: {m.get('content', '')[:80]}" for m in chat_history[-2:]])
                prompt += f"\n\n**Recent conversation**:\n{recent}"
            
            # Generate response using Gemini - SINGLE FAST CALL
            import asyncio
            response = await asyncio.to_thread(self.chat_model.generate_content, prompt)
            
            return {
                "response": response.text,
                "symptoms_detected": symptoms,
                "patient_info": patient_info,
                "knowledge_base_used": len(symptoms) > 0
            }
            
        except Exception as e:
            error_msg = str(e)
            print(f"❌ Error processing message: {error_msg}")
            import traceback
            print("Full traceback:")
            traceback.print_exc()
            
            # Return more helpful error message
            if "GEMINI_API_KEY" in error_msg or "API key" in error_msg.lower():
                return {
                    "response": "I apologize, but there's an issue with the AI service configuration. Please check the backend logs.",
                    "error": "Gemini API configuration error"
                }
            elif "generate_content" in error_msg or "genai" in error_msg.lower():
                return {
                    "response": "I apologize, but there's an issue connecting to the AI service. Please check the backend logs.",
                    "error": "Gemini API connection error"
                }
            else:
                return {
                    "response": f"I apologize, but I encountered an error: {error_msg}. Please check the backend terminal for details.",
                    "error": error_msg
                }