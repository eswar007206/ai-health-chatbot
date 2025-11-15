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
from .fever_triage import FeverTriageAssistant

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
        
        # Initialize fever triage assistant
        try:
            self.fever_triage = FeverTriageAssistant()
            print("✓ Fever triage assistant initialized")
        except Exception as e:
            print(f"❌ Error initializing fever triage assistant: {e}")
            self.fever_triage = None
        
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
            'disease_prediction': None,  # human-readable label or None
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
                raw_pred = self.disease_classifier.predict([symptom_embedding])[0]
                disease_label = str(raw_pred)

                max_prob = None
                if hasattr(self.disease_classifier, 'predict_proba'):
                    proba = self.disease_classifier.predict_proba([symptom_embedding])[0]
                    max_prob = float(max(proba))

                # ⚠️ Filter out low-confidence or meaningless labels like "Unknown_Fever"
                if (
                    disease_label.lower() == "unknown_fever".lower()
                    or (max_prob is not None and max_prob < 0.6)
                ):
                    # Treat this as "no reliable disease prediction" so we don't surface it to users
                    predictions['disease_prediction'] = None
                else:
                    # Make the label more human-friendly (remove underscores, title-case)
                    formatted_label = disease_label.replace("_", " ").strip()
                    predictions['disease_prediction'] = formatted_label
                    if max_prob is not None:
                        predictions['model_confidence']['disease'] = max_prob
            
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
    
    def _build_gemini_prompt(self, message: str, model_data: Dict[str, Any], chat_history: List[Dict] = None) -> str:
        """
        Build a prompt for Gemini to create a natural, human-like response based on trained model predictions.
        
        This method takes the structured output from trained models and knowledge base,
        and creates a prompt that instructs Gemini to make it conversational and helpful.
        """
        prompt_parts = []
        
        # System context
        prompt_parts.append("You are FeverEase, a friendly and empathetic medical AI assistant.")
        prompt_parts.append("Your role is to help users understand their health concerns based on medical data analysis.")
        prompt_parts.append("")
        
        # User's message
        prompt_parts.append(f"**User's Message:** \"{message}\"")
        prompt_parts.append("")
        
        # Trained Model Results Section
        prompt_parts.append("**ANALYSIS FROM TRAINED MODELS:**")
        prompt_parts.append("Our medical AI models have analyzed the symptoms and provided the following predictions:")
        prompt_parts.append("")
        
        has_model_data = False
        
        # Disease prediction from trained models
        if model_data.get('disease_prediction'):
            conf = model_data.get('disease_confidence', 0)
            disease = model_data['disease_prediction']
            # Clean up disease name
            if "unknown_fever" not in disease.lower():
                prompt_parts.append(f"- **Predicted Condition:** {disease} (confidence: {conf:.0%})")
                has_model_data = True
        
        # Severity prediction
        if model_data.get('severity_prediction') is not None:
            severity = model_data['severity_prediction']
            prompt_parts.append(f"- **Severity Score:** {severity:.1f}/10")
            has_model_data = True
        
        # Emergency prediction
        if model_data.get('emergency_prediction') is not None:
            is_emergency = model_data['emergency_prediction']
            prompt_parts.append(f"- **Emergency Alert:** {'YES - Immediate medical attention may be needed' if is_emergency else 'NO'}")
            has_model_data = True
        
        # Knowledge base diseases
        if model_data.get('possible_diseases'):
            diseases = model_data['possible_diseases']
            if diseases:
                prompt_parts.append(f"- **Possible Conditions:** {', '.join([d.replace('_', ' ').title() for d in list(diseases.keys())[:3]])}")
                has_model_data = True
        
        # Severity assessment from knowledge base
        if model_data.get('severity_assessment') and model_data['severity_assessment'].get('average_severity'):
            avg_sev = model_data['severity_assessment']['average_severity']
            prompt_parts.append(f"- **Severity Assessment:** {avg_sev:.1f}/10 (from medical knowledge base)")
            has_model_data = True
        
        if not has_model_data:
            prompt_parts.append("- No specific predictions available from trained models (this is okay - use your medical knowledge)")
        
        prompt_parts.append("")
        
        # Additional information
        if model_data.get('precautions'):
            prompt_parts.append(f"**Precautions to Consider:** {', '.join(model_data['precautions'][:3])}")
            prompt_parts.append("")
        
        if model_data.get('treatment_recommendations'):
            prompt_parts.append(f"**Treatment Recommendations:** {', '.join([str(t) for t in model_data['treatment_recommendations'][:3]])}")
            prompt_parts.append("")
        
        if model_data.get('is_emergency'):
            prompt_parts.append("⚠️ **EMERGENCY INDICATOR:** This case may require immediate medical attention.")
            prompt_parts.append("")
        
        # Symptoms and patient info
        symptoms = model_data.get('symptoms_detected', [])
        patient_info = model_data.get('patient_info', {})
        
        if symptoms:
            prompt_parts.append(f"**Symptoms Detected:** {', '.join(symptoms)}")
        if patient_info:
            prompt_parts.append(f"**Patient Information:** {patient_info}")
        
        prompt_parts.append("")
        prompt_parts.append("**YOUR TASK:**")
        prompt_parts.append("Based on the trained model predictions above, create a natural, conversational, and empathetic response.")
        prompt_parts.append("")
        prompt_parts.append("**Response Guidelines:**")
        prompt_parts.append("1. **Be conversational and human-like** - Write as if you're a caring medical assistant talking to a friend")
        prompt_parts.append("2. **Use the model predictions** - Reference the predictions naturally (e.g., 'Based on your symptoms, our analysis suggests...')")
        prompt_parts.append("3. **Explain in simple terms** - Convert medical jargon into easy-to-understand language")
        prompt_parts.append("4. **Be empathetic** - Acknowledge the user's concerns and show understanding")
        prompt_parts.append("5. **Provide actionable advice** - Give clear, practical recommendations")
        prompt_parts.append("6. **Include safety warnings** - If emergency indicators are present, emphasize seeking immediate care")
        prompt_parts.append("7. **Mention limitations** - Always remind that you're an AI assistant and they should consult healthcare professionals")
        prompt_parts.append("")
        prompt_parts.append("**Format your response naturally** - Don't use bullet points unless necessary. Write in flowing, conversational paragraphs.")
        prompt_parts.append("Make it feel like a real conversation, not a medical report.")
        prompt_parts.append("")
        prompt_parts.append("**Language Policy:**")
        prompt_parts.append("- Detect the user's language from their message and respond in that exact language")
        prompt_parts.append("- Only switch languages if the user explicitly requests it")
        prompt_parts.append("")
        prompt_parts.append("**Important:**")
        prompt_parts.append("- If model predictions show 'Unknown_Fever' or low confidence, don't mention that label")
        prompt_parts.append("- Instead, say the cause is uncertain and list the most likely possibilities based on symptoms")
        prompt_parts.append("- Always prioritize user safety - if emergency indicators are present, emphasize immediate medical care")
        prompt_parts.append("")
        prompt_parts.append("Now, write a natural, helpful response to the user:")
        
        # Add chat history context if available
        if chat_history:
            recent_context = []
            for msg in chat_history[-3:]:  # Last 3 messages
                role = msg.get('role', 'user')
                content = msg.get('content', '')[:100]  # First 100 chars
                recent_context.append(f"{role}: {content}")
            if recent_context:
                prompt_parts.append("")
                prompt_parts.append("**Recent Conversation Context:**")
                prompt_parts.append("\n".join(recent_context))
        
        return "\n".join(prompt_parts)
    
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
                    # Make disease names nicer to read
                    pretty_name = disease.replace("_", " ").strip()
                    context_parts.append(f"- {pretty_name} (confidence: {confidence:.1%})")
            
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
    
    async def _process_fever_triage(self, message: str, chat_history: List[Dict] = None) -> Dict:
        """
        Process fever-related queries using the fever triage assistant.
        NOTE: This method is currently disabled - chatbot works normally without mandatory questions.
        """
        # DISABLED: Fever triage with mandatory questions is disabled
        # The chatbot now works normally without forcing questions
        # This method is kept for potential future use but is not called
        return {
            "response": "Fever triage is currently disabled. Please use normal chatbot flow.",
            "symptoms_detected": [],
            "patient_info": {},
            "knowledge_base_used": False,
            "fever_triage": False
        }
        
        # OLD CODE BELOW - DISABLED
        if False:  # This block never executes
            questions_to_ask = []
            if 'age' in missing_mandatory:
                questions_to_ask.append("What is your age?")
            if 'temperature' in missing_mandatory:
                questions_to_ask.append("What is your current temperature? (Please specify in °C or °F)")
            if 'duration' in missing_mandatory:
                questions_to_ask.append("Since how many days have you had the fever?")
            
            # Build friendly response asking for missing information
            # Check if user already provided some info in current message
            user_provided_info = bool(extracted.get('age') or extracted.get('temperature') or extracted.get('duration_hours') or extracted.get('duration_days'))
            
            if len(questions_to_ask) == 3:
                if user_provided_info:
                    response_text = "Thank you for that information! I just need a couple more details to help you better:\n\n"
                else:
                    response_text = "Oh no, I'm sorry to hear you're feeling unwell. Having a high temperature and a cough is no fun at all.\n\nTo help me understand a little more about what's going on, could you please tell me a few things first?\n\n"
            else:
                if user_provided_info:
                    response_text = "Thanks! I just need one more detail:\n\n"
                else:
                    response_text = "I still need a few more details to help you properly:\n\n"
            
            for i, question in enumerate(questions_to_ask, 1):
                response_text += f"{i}. {question}\n"
            
            response_text += "\nPlease provide these details so I can give you appropriate guidance. ⚠️ **IMPORTANT**: This is general medical guidance, not a diagnosis. Please consult a healthcare professional."
            
            # Use Gemini to make it more conversational if available
            if self.chat_model:
                try:
                    # Build context about what user already provided
                    provided_context = []
                    if patient_data.get('age'):
                        provided_context.append(f"Age: {patient_data.get('age')}")
                    if patient_data.get('temperature'):
                        provided_context.append(f"Temperature: {patient_data.get('temperature')}°F")
                    if patient_data.get('duration_hours') or patient_data.get('duration_days'):
                        duration = patient_data.get('duration_days') or (patient_data.get('duration_hours', 0) / 24)
                        provided_context.append(f"Duration: {duration} days")
                    
                    context_str = f"User has already provided: {', '.join(provided_context)}" if provided_context else "User hasn't provided any information yet"
                    
                    enhancement_prompt = f"""The user said: "{message}"

{context_str}

I still need to ask these questions:
{chr(10).join(questions_to_ask)}

Generate a friendly, warm, and conversational response asking for these remaining details. Be polite and acknowledge any information they've already shared. Keep it simple and clear. Match the user's language if possible. Don't repeat the same message if they've already answered some questions."""
                    
                    import asyncio
                    enhanced_response = await asyncio.to_thread(
                        self.chat_model.generate_content, enhancement_prompt
                    )
                    response_text = enhanced_response.text
                except Exception as e:
                    print(f"Warning: Could not enhance mandatory questions response: {e}")
            
            return {
                "response": response_text,
                "symptoms_detected": patient_data.get('symptoms', []),
                "patient_info": patient_data,
                "triage_level": "collecting_mandatory_inputs",
                "knowledge_base_used": False,
                "fever_triage": True
            }
        
        # All mandatory questions answered - proceed with triage
        # Generate triage response
        triage_result = self.fever_triage.generate_triage_response(patient_data, chat_history)
        
        # If we're collecting inputs, enhance the response with Gemini for better natural language
        if triage_result.get('triage_level') == 'collecting_inputs':
            # Use Gemini to make the input collection more conversational
            enhanced_prompt = f"""You are a medical AI assistant helping with fever assessment. 

The user said: "{message}"

I need to collect the following information: {', '.join(triage_result.get('missing_inputs', []))}

The triage assistant has generated this response:
{triage_result.get('response', '')}

Please make this response more conversational and natural while keeping all the questions. Make it feel like a friendly medical assistant asking follow-up questions, not a form. Keep it concise and warm."""
            
            try:
                import asyncio
                enhanced_response = await asyncio.to_thread(
                    self.chat_model.generate_content, enhanced_prompt
                )
                triage_result['response'] = enhanced_response.text
            except Exception as e:
                print(f"Warning: Could not enhance fever triage response: {e}")
                # Use original response if enhancement fails
        
        # If we have a triage result, enhance it with Gemini for better language handling
        elif triage_result.get('response'):
            # Enhance the response to match user's language and make it more natural
            enhancement_prompt = f"""The user said: "{message}"

The fever triage assistant has generated this medical response:
{triage_result.get('response', '')}

Please:
1. Ensure the response matches the user's language (detect from their message)
2. Make it more natural and conversational while keeping all medical information
3. Ensure the safety disclaimer is included
4. Keep all the structured information (red/yellow/green flags, recommendations, etc.)

Respond in the same language as the user's message."""
            
            try:
                import asyncio
                enhanced_response = await asyncio.to_thread(
                    self.chat_model.generate_content, enhancement_prompt
                )
                triage_result['response'] = enhanced_response.text
            except Exception as e:
                print(f"Warning: Could not enhance fever triage response: {e}")
                # Use original response if enhancement fails
        
        return {
            "response": triage_result.get('response', ''),
            "symptoms_detected": patient_data.get('symptoms', []),
            "patient_info": patient_data,
            "triage_level": triage_result.get('triage_level'),
            "fever_pattern": triage_result.get('fever_pattern'),
            "knowledge_base_used": True,
            "fever_triage": True
        }
            
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

            # REMOVED: Fever triage mandatory questions - chatbot now works normally
            # The chatbot will work like a normal conversational AI without forcing mandatory questions
            # Fever triage is disabled to allow natural conversation flow

            # STEP 1: Extract symptoms and patient info from message (FAST - no API calls)
            symptoms = self._extract_symptoms_from_message(message)
            patient_info = self._extract_patient_info(message)
            
            print(f"[STEP 1] Extracted - Symptoms: {symptoms}, Patient Info: {patient_info}")
            
            # STEP 2: Get predictions from TRAINED MODELS first (fast, local)
            model_predictions = {}
            if symptoms:
                try:
                    model_predictions = self._predict_with_models(symptoms)
                    if model_predictions:
                        print(f"[STEP 2] 🤖 Trained Model Predictions: {model_predictions}")
                except Exception as e:
                    print(f"[STEP 2] ⚠️ Model prediction error: {e}")
            
            # STEP 3: Get knowledge base data (with safe fallbacks)
            diseases = {}
            severity = {}
            emergency_info = {}
            precautions = []
            treatment_recommendations = []
            
            if symptoms:
                try:
                    diseases = self.knowledge_base.get_diseases_for_symptoms(symptoms) or {}
                    print(f"[STEP 3] Knowledge Base - Diseases: {list(diseases.keys())[:3] if diseases else 'None'}")
                except Exception as e:
                    print(f"[STEP 3] Error getting diseases: {e}")
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
                try:
                    # Get treatment recommendations
                    disease_list = list(diseases.keys()) if diseases else []
                    avg_severity = severity.get('average_severity', 5) if severity else 5
                    is_emergency = emergency_info.get('is_emergency', False) if emergency_info else False
                    treatment_recommendations = self.knowledge_base.get_treatment_recommendations(
                        symptoms, disease_list, avg_severity, is_emergency
                    ) or []
                except:
                    pass
            
            # STEP 4: Build structured data from trained models and knowledge base
            model_data = {
                "disease_prediction": model_predictions.get('disease_prediction'),
                "disease_confidence": model_predictions.get('model_confidence', {}).get('disease', 0),
                "severity_prediction": model_predictions.get('severity_prediction'),
                "emergency_prediction": model_predictions.get('emergency_prediction'),
                "possible_diseases": dict(list(diseases.items())[:5]) if diseases else {},
                "severity_assessment": severity,
                "is_emergency": emergency_info.get('is_emergency', False),
                "precautions": precautions[:5] if precautions else [],
                "treatment_recommendations": treatment_recommendations[:5] if treatment_recommendations else [],
                "symptoms_detected": symptoms,
                "patient_info": patient_info
            }
            
            print(f"[STEP 4] Model Data Summary: Disease={model_data['disease_prediction']}, Severity={model_data['severity_prediction']}, Emergency={model_data['is_emergency']}")
            
            # STEP 5: Use Gemini to create a natural, human-like response based on model predictions
            prompt = self._build_gemini_prompt(message, model_data, chat_history)
            
            print(f"[STEP 5] Sending to Gemini for human-like response enhancement...")

            
            # Generate response using Gemini - SINGLE FAST CALL
            import asyncio
            response = await asyncio.to_thread(self.chat_model.generate_content, prompt)
            
            print(f"[STEP 5] ✅ Gemini response generated")
            
            return {
                "response": response.text,
                "symptoms_detected": symptoms,
                "patient_info": patient_info,
                "model_predictions": model_predictions,
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