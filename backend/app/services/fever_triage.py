"""
Fever Triage Assistant Module

This module implements a comprehensive fever triage system that:
1. Collects structured inputs about fever and symptoms
2. Classifies fever patterns
3. Applies triage rules (RED/YELLOW/GREEN flags)
4. Generates stage-appropriate responses
5. Handles follow-up checks
"""

from typing import Dict, List, Optional, Any, Tuple
import re
from datetime import datetime, timedelta


class FeverTriageAssistant:
    """Fever triage assistant that follows medically-informed triage steps"""
    
    SAFETY_DISCLAIMER = "⚠️ **IMPORTANT**: This is general medical guidance, not a diagnosis. Please consult a healthcare professional for proper medical evaluation."
    
    def __init__(self):
        # Required inputs for fever assessment
        self.required_inputs = {
            'age': None,
            'temperature': None,
            'temperature_unit': None,  # 'C' or 'F'
            'duration_hours': None,
            'symptoms': [],  # List of symptoms
            'hydration_status': None,
            'is_pediatric': None,  # True if age < 18
            'is_pregnant': None,
            'chronic_conditions': [],
            'mosquito_exposure': None,
            'recent_travel': None,
            'medicines_taken': []
        }
        
        # Red flags (immediate emergency)
        self.red_flags = {
            'difficulty_breathing': False,
            'seizures': False,
            'confusion': False,
            'stiff_neck': False,
            'purple_rash': False,
            'bleeding': False,
            'severe_vomiting': False,
            'dehydration_signs': False,
            'severe_pain': False,
            'infant_fever': False,  # < 3 months
            'high_temperature': False  # >103°F / 39.4°C
        }
        
        # Yellow flags (doctor visit within 24-48 hours)
        self.yellow_flags = {
            'fever_over_3_days': False,
            'persistent_high_fever': False,
            'heavy_body_aches': False,
            'travel_to_endemic_area': False,
            'pregnancy': False,
            'immunocompromised': False
        }
        
        # Common symptoms to check
        self.symptom_keywords = {
            'rash': ['rash', 'skin rash', 'red spots', 'skin irritation'],
            'cough': ['cough', 'coughing', 'dry cough', 'wet cough'],
            'sore_throat': ['sore throat', 'throat pain', 'difficulty swallowing'],
            'body_pain': ['body pain', 'muscle pain', 'joint pain', 'body ache', 'aches'],
            'chills': ['chills', 'shivering', 'feeling cold'],
            'headache': ['headache', 'head pain', 'migraine'],
            'vomiting': ['vomiting', 'nausea', 'throwing up', 'vomit'],
            'diarrhea': ['diarrhea', 'loose stools', 'frequent bowel movements'],
            'difficulty_breathing': ['difficulty breathing', 'shortness of breath', 'breathing problem', 'can\'t breathe'],
            'seizures': ['seizure', 'convulsion', 'fits'],
            'confusion': ['confusion', 'disorientation', 'mental confusion', 'not thinking clearly'],
            'stiff_neck': ['stiff neck', 'neck stiffness', 'can\'t move neck'],
            'purple_rash': ['purple rash', 'petechiae', 'bleeding under skin'],
            'bleeding': ['bleeding', 'blood', 'hemorrhage'],
            'severe_vomiting': ['severe vomiting', 'can\'t keep anything down', 'persistent vomiting'],
            'dehydration_signs': ['dehydration', 'dry mouth', 'no urination', 'dark urine', 'dizziness when standing'],
            'severe_pain': ['severe pain', 'unbearable pain', 'extreme pain']
        }
    
    def detect_fever_query(self, message: str) -> bool:
        """Detect if the message is about fever - be more specific to avoid false positives"""
        message_lower = message.lower()
        
        # Strong fever indicators (must have one of these)
        strong_indicators = [
            'fever', 'febrile', 'pyrexia', 'feverish',
            'have fever', 'got fever', 'fever since', 'running a fever',
            'high fever', 'low fever', 'fever with'
        ]
        
        # Weak indicators (need context)
        weak_indicators = [
            'temperature', 'temp', 'hot', 'burning', 'high temp'
        ]
        
        # Check for strong indicators first
        has_strong = any(keyword in message_lower for keyword in strong_indicators)
        
        # For weak indicators, only trigger if they appear with fever context
        has_weak_with_context = False
        if any(keyword in message_lower for keyword in weak_indicators):
            # Only trigger if it's clearly about having a fever, not just mentioning temperature
            context_words = ['have', 'got', 'my', 'feeling', 'symptom', 'unwell', 'sick', 'ill']
            has_weak_with_context = any(ctx in message_lower for ctx in context_words)
        
        # Only return True if we have strong indicators OR weak indicators with context
        # This prevents simple answers like "101" or "temperature is 98" from triggering
        return has_strong or has_weak_with_context
    
    def extract_structured_inputs(self, message: str, chat_history: List[Dict] = None) -> Dict[str, Any]:
        """Extract structured inputs from message and chat history"""
        message_lower = message.lower()
        extracted = {}
        
        # Extract age - more flexible patterns
        age_patterns = [
            r'(\d+)\s*(?:year|yr|y\.o|years old|age|month|months)',
            r'age[:\s]*(\d+)',
            r'i\s*(?:am|m)\s*(\d+)',
            r'(\d+)\s*(?:year|month)',
            r'^(\d+)$',  # Just a number (if it's a reasonable age)
            r'(\d{1,2})\s*(?:years?|yrs?|y\.o\.?)',  # More flexible
        ]
        for pattern in age_patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                age = int(match.group(1))
                # Only accept if it's a reasonable age (1-120)
                if 1 <= age <= 120:
                    if 'month' in message_lower and age < 12:
                        extracted['age_months'] = age
                        extracted['age'] = age / 12
                    else:
                        extracted['age'] = age
                    break
        
        # Extract temperature - more flexible patterns
        temp_patterns = [
            r'(\d+\.?\d*)\s*(?:degree|deg|°)?\s*(?:f|F|fahrenheit)',
            r'(\d+\.?\d*)\s*(?:degree|deg|°)?\s*(?:c|C|celsius|celcius)',
            r'temp[erature]*\s*(?:of|is|:)?\s*(\d+\.?\d*)',
            r'(\d+\.?\d*)\s*(?:°|degree)',
            r'^(\d{2,3}\.?\d*)$',  # Just a number (if it's a reasonable temperature)
            r'(\d{2,3}\.?\d*)\s*(?:f|F|c|C|°)?',  # Number with optional unit
        ]
        for pattern in temp_patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                temp_value = float(match.group(1))
                # Determine unit and validate
                is_celsius = 'c' in message_lower or 'celsius' in message_lower
                is_fahrenheit = 'f' in message_lower or 'fahrenheit' in message_lower
                
                # If no unit specified, guess based on value
                if not is_celsius and not is_fahrenheit:
                    # If > 50, likely Celsius; if 90-110, likely Fahrenheit
                    if temp_value > 50:
                        is_celsius = True
                    elif 90 <= temp_value <= 110:
                        is_fahrenheit = True
                    elif 30 <= temp_value <= 45:
                        is_celsius = True
                
                # Only accept if it's a reasonable temperature
                if (is_fahrenheit and 90 <= temp_value <= 110) or (is_celsius and 30 <= temp_value <= 45) or (not is_celsius and not is_fahrenheit and (90 <= temp_value <= 110 or 30 <= temp_value <= 45)):
                    if is_celsius or temp_value > 50:
                        extracted['temperature'] = (temp_value * 9/5) + 32  # Convert to Fahrenheit
                        extracted['temperature_celsius'] = temp_value
                        extracted['temperature_unit'] = 'C'
                    else:
                        extracted['temperature'] = temp_value
                        extracted['temperature_celsius'] = (temp_value - 32) * 5/9
                        extracted['temperature_unit'] = 'F'
                    break
        
        # Extract duration - more flexible patterns
        duration_patterns = [
            r'(\d+)\s*(?:hour|hr|h)\s*(?:ago|since)',
            r'(\d+)\s*(?:day|days)\s*(?:ago|since)',
            r'for\s*(\d+)\s*(?:hour|day|days)',
            r'since\s*(\d+)\s*(?:hour|day|days)',
            r'(\d+)\s*(?:hour|day|days)',
            r'^(\d+)\s*(?:day|days?|hour|hours?|hr|hrs?)$',  # Just number with unit
            r'^(\d+)$',  # Just a number (assume days if > 1, hours if <= 1)
        ]
        for pattern in duration_patterns:
            match = re.search(pattern, message, re.IGNORECASE)
            if match:
                duration = int(match.group(1))
                # Only accept if it's a reasonable duration (1 hour to 30 days)
                if 1 <= duration <= 720:  # 30 days * 24 hours
                    if 'day' in message_lower or (duration > 24 and 'hour' not in message_lower):
                        extracted['duration_days'] = duration
                        extracted['duration_hours'] = duration * 24
                    elif 'hour' in message_lower or duration <= 24:
                        extracted['duration_hours'] = duration
                        extracted['duration_days'] = duration / 24 if duration >= 24 else 0
                    else:
                        # Default: if number > 24, assume days; otherwise hours
                        if duration > 24:
                            extracted['duration_days'] = duration
                            extracted['duration_hours'] = duration * 24
                        else:
                            extracted['duration_hours'] = duration
                            extracted['duration_days'] = 0
                    break
        
        # Extract symptoms
        detected_symptoms = []
        for symptom, keywords in self.symptom_keywords.items():
            if any(keyword in message_lower for keyword in keywords):
                detected_symptoms.append(symptom)
        if detected_symptoms:
            extracted['symptoms'] = detected_symptoms
        
        # Extract hydration status
        hydration_keywords = {
            'good': ['drinking well', 'good hydration', 'drinking water', 'urinating normally'],
            'poor': ['not drinking', 'poor hydration', 'dry mouth', 'no urination', 'dark urine'],
            'moderate': ['drinking some', 'moderate hydration']
        }
        for status, keywords in hydration_keywords.items():
            if any(keyword in message_lower for keyword in keywords):
                extracted['hydration_status'] = status
                break
        
        # Extract pregnancy status
        if any(word in message_lower for word in ['pregnant', 'pregnancy', 'expecting', 'expectant']):
            extracted['is_pregnant'] = True
        
        # Extract chronic conditions
        chronic_keywords = ['diabetes', 'hypertension', 'heart disease', 'asthma', 'copd', 
                           'kidney disease', 'liver disease', 'cancer', 'hiv', 'immunocompromised']
        chronic_conditions = []
        for condition in chronic_keywords:
            if condition in message_lower:
                chronic_conditions.append(condition)
        if chronic_conditions:
            extracted['chronic_conditions'] = chronic_conditions
        
        # Extract mosquito exposure
        if any(word in message_lower for word in ['mosquito', 'mosquito bite', 'dengue area', 'malaria area']):
            extracted['mosquito_exposure'] = True
        
        # Extract travel history
        travel_keywords = ['travel', 'traveled', 'visited', 'went to', 'returned from']
        if any(keyword in message_lower for keyword in travel_keywords):
            extracted['recent_travel'] = True
        
        # Extract medicines taken
        medicine_keywords = ['paracetamol', 'acetaminophen', 'tylenol', 'ibuprofen', 'advil', 
                            'aspirin', 'medicine', 'medication', 'took', 'taking']
        medicines = []
        for keyword in medicine_keywords:
            if keyword in message_lower:
                # Try to extract medicine name
                context = message_lower[max(0, message_lower.find(keyword)-20):message_lower.find(keyword)+50]
                medicines.append(keyword)
        if medicines:
            extracted['medicines_taken'] = medicines
        
        return extracted
    
    def update_patient_data(self, current_data: Dict[str, Any], new_extracted: Dict[str, Any]) -> Dict[str, Any]:
        """Update patient data with new extracted information"""
        updated = current_data.copy()
        
        for key, value in new_extracted.items():
            if value is not None:
                if key == 'symptoms':
                    # Merge symptoms lists
                    existing = updated.get('symptoms', [])
                    updated['symptoms'] = list(set(existing + value))
                elif key == 'chronic_conditions':
                    # Merge chronic conditions
                    existing = updated.get('chronic_conditions', [])
                    updated['chronic_conditions'] = list(set(existing + value))
                elif key == 'medicines_taken':
                    # Merge medicines
                    existing = updated.get('medicines_taken', [])
                    updated['medicines_taken'] = list(set(existing + value))
                else:
                    updated[key] = value
        
        # Auto-calculate derived fields
        if updated.get('age'):
            age = updated['age']
            if age < 0.25:  # < 3 months
                updated['is_pediatric'] = True
                updated['is_infant'] = True
            elif age < 18:
                updated['is_pediatric'] = True
                updated['is_infant'] = False
            else:
                updated['is_pediatric'] = False
                updated['is_infant'] = False
        
        return updated
    
    def check_red_flags(self, patient_data: Dict[str, Any]) -> Tuple[List[str], bool]:
        """Check for red flags (immediate emergency)"""
        red_flag_list = []
        has_red_flag = False
        
        # Check symptoms for red flags
        symptoms = patient_data.get('symptoms', [])
        
        if 'difficulty_breathing' in symptoms:
            red_flag_list.append("Difficulty breathing")
            has_red_flag = True
        
        if 'seizures' in symptoms:
            red_flag_list.append("Seizures or convulsions")
            has_red_flag = True
        
        if 'confusion' in symptoms:
            red_flag_list.append("Confusion or disorientation")
            has_red_flag = True
        
        if 'stiff_neck' in symptoms:
            red_flag_list.append("Stiff neck")
            has_red_flag = True
        
        if 'purple_rash' in symptoms:
            red_flag_list.append("Purple rash or petechiae")
            has_red_flag = True
        
        if 'bleeding' in symptoms:
            red_flag_list.append("Bleeding")
            has_red_flag = True
        
        if 'severe_vomiting' in symptoms:
            red_flag_list.append("Severe or persistent vomiting")
            has_red_flag = True
        
        if 'dehydration_signs' in symptoms:
            red_flag_list.append("Signs of dehydration")
            has_red_flag = True
        
        if 'severe_pain' in symptoms:
            red_flag_list.append("Severe pain")
            has_red_flag = True
        
        # Check temperature
        temp = patient_data.get('temperature')
        if temp and temp > 103.0:  # >103°F
            red_flag_list.append(f"High temperature ({temp:.1f}°F / {patient_data.get('temperature_celsius', (temp-32)*5/9):.1f}°C)")
            has_red_flag = True
        
        # Check infant fever
        if patient_data.get('is_infant') and temp:
            red_flag_list.append("Infant under 3 months with fever")
            has_red_flag = True
        
        return red_flag_list, has_red_flag
    
    def check_yellow_flags(self, patient_data: Dict[str, Any]) -> Tuple[List[str], bool]:
        """Check for yellow flags (doctor visit within 24-48 hours)"""
        yellow_flag_list = []
        has_yellow_flag = False
        
        # Fever over 3 days
        duration = patient_data.get('duration_hours', 0)
        if duration >= 72:  # 3 days
            yellow_flag_list.append("Fever lasting more than 3 days")
            has_yellow_flag = True
        
        # Persistent high fever
        temp = patient_data.get('temperature')
        if temp and temp >= 101.0 and duration >= 24:  # >101°F for more than 24 hours
            yellow_flag_list.append("Persistent high fever")
            has_yellow_flag = True
        
        # Heavy body aches
        if 'body_pain' in patient_data.get('symptoms', []):
            yellow_flag_list.append("Heavy body aches")
            has_yellow_flag = True
        
        # Travel to endemic areas
        if patient_data.get('mosquito_exposure') or patient_data.get('recent_travel'):
            yellow_flag_list.append("Recent travel or mosquito exposure")
            has_yellow_flag = True
        
        # Pregnancy
        if patient_data.get('is_pregnant'):
            yellow_flag_list.append("Pregnancy")
            has_yellow_flag = True
        
        # Immunocompromised
        chronic = patient_data.get('chronic_conditions', [])
        immunocompromised_conditions = ['hiv', 'cancer', 'immunocompromised']
        if any(cond in ' '.join(chronic).lower() for cond in immunocompromised_conditions):
            yellow_flag_list.append("Immunocompromised condition")
            has_yellow_flag = True
        
        return yellow_flag_list, has_yellow_flag
    
    def classify_fever_pattern(self, patient_data: Dict[str, Any]) -> str:
        """Classify the fever pattern based on symptoms and history"""
        symptoms = patient_data.get('symptoms', [])
        temp = patient_data.get('temperature')
        duration = patient_data.get('duration_hours', 0)
        
        # Dengue-like pattern
        if (patient_data.get('mosquito_exposure') or 
            ('rash' in symptoms and 'body_pain' in symptoms and temp and temp > 101)):
            return "dengue-like"
        
        # Malaria-like pattern
        if (patient_data.get('mosquito_exposure') or 
            ('chills' in symptoms and 'body_pain' in symptoms and duration > 24)):
            return "malaria-like"
        
        # Typhoid-like pattern
        if (duration > 48 and 'headache' in symptoms and 
            ('diarrhea' in symptoms or 'vomiting' in symptoms)):
            return "typhoid-like"
        
        # Bacterial-like pattern
        if (temp and temp > 102 and duration > 24 and 
            ('cough' in symptoms or 'sore_throat' in symptoms)):
            return "bacterial-like"
        
        # Pediatric fever
        if patient_data.get('is_pediatric'):
            return "pediatric_fever"
        
        # Heat/dehydration fever
        if (patient_data.get('hydration_status') == 'poor' and 
            temp and temp < 101):
            return "heat_dehydration_fever"
        
        # Default to viral
        return "viral"
    
    def get_missing_inputs(self, patient_data: Dict[str, Any]) -> List[str]:
        """Get list of missing required inputs"""
        missing = []
        
        if not patient_data.get('age'):
            missing.append("age")
        if not patient_data.get('temperature'):
            missing.append("temperature")
        if not patient_data.get('duration_hours'):
            missing.append("duration")
        if not patient_data.get('symptoms') or len(patient_data.get('symptoms', [])) == 0:
            missing.append("symptoms")
        if not patient_data.get('hydration_status'):
            missing.append("hydration status")
        
        return missing
    
    def calculate_severity_score(self, patient_data: Dict[str, Any]) -> int:
        """
        Calculate Severity Score (1-10) based on:
        - Temperature points
        - Duration points
        - Symptom danger points
        """
        score = 0
        
        # Temperature Points
        temp = patient_data.get('temperature')  # In Fahrenheit
        temp_c = patient_data.get('temperature_celsius')
        
        # Use Celsius if available, otherwise convert Fahrenheit
        if temp_c:
            temp_value = temp_c
        elif temp:
            temp_value = (temp - 32) * 5/9  # Convert to Celsius
        else:
            temp_value = None
        
        if temp_value:
            if temp_value < 37.2:  # < 99°F / 37.2°C
                score += 0
            elif 37.2 <= temp_value < 38.0:  # 99–100.4°F / 37.2–38°C
                score += 2
            elif 38.0 <= temp_value < 39.0:  # 100.4–102.2°F / 38–39°C
                score += 4
            elif 39.0 <= temp_value < 39.7:  # 102.2–103.5°F / 39–39.7°C
                score += 6
            else:  # >103.5°F / 39.7°C
                score += 8
        
        # Duration Points
        duration_days = patient_data.get('duration_days')
        duration_hours = patient_data.get('duration_hours', 0)
        
        if duration_days:
            days = duration_days
        else:
            days = duration_hours / 24 if duration_hours else 0
        
        if 0 <= days <= 1:
            score += 1
        elif 2 <= days <= 3:
            score += 2
        elif 4 <= days <= 5:
            score += 3
        elif days >= 6:
            score += 4
        
        # Symptom Danger Points
        symptoms = patient_data.get('symptoms', [])
        
        if 'headache' in symptoms:
            score += 1
        if 'vomiting' in symptoms or 'severe_vomiting' in symptoms:
            score += 1
        if 'rash' in symptoms or 'purple_rash' in symptoms:
            score += 2
        if 'difficulty_breathing' in symptoms:
            score += 3
        
        # Check for serious conditions
        if patient_data.get('mosquito_exposure') or 'dengue' in str(patient_data).lower() or 'malaria' in str(patient_data).lower() or 'typhoid' in str(patient_data).lower():
            score += 4
        
        if 'confusion' in symptoms or 'seizures' in symptoms:
            score += 5
        
        # Ensure score is between 1 and 10
        score = max(1, min(10, score))
        
        return score
    
    def get_severity_tag(self, severity_score: int) -> str:
        """Get the appropriate color tag based on severity score"""
        if 1 <= severity_score <= 3:
            return "green"
        elif 4 <= severity_score <= 6:
            return "yellow"
        elif 7 <= severity_score <= 8:
            return "red"
        elif 9 <= severity_score <= 10:
            return "purple"
        else:
            return "green"  # Default
    
    def generate_triage_response(self, patient_data: Dict[str, Any], chat_history: List[Dict] = None) -> Dict[str, Any]:
        """Generate appropriate triage response based on patient data"""
        
        # Check for red flags first
        red_flags, has_red = self.check_red_flags(patient_data)
        yellow_flags, has_yellow = self.check_yellow_flags(patient_data)
        
        # Check what information is missing
        missing = self.get_missing_inputs(patient_data)
        
        # If critical information is missing, ask for it
        if missing and not has_red:
            return self._generate_input_collection_response(missing, patient_data)
        
        # Calculate severity score
        severity_score = self.calculate_severity_score(patient_data)
        severity_tag = self.get_severity_tag(severity_score)
        
        # Classify fever pattern
        fever_pattern = self.classify_fever_pattern(patient_data)
        
        # Generate response based on triage level
        if has_red:
            response = self._generate_red_flag_response(red_flags, patient_data, fever_pattern)
        elif has_yellow:
            response = self._generate_yellow_flag_response(yellow_flags, patient_data, fever_pattern)
        else:
            response = self._generate_green_flag_response(patient_data, fever_pattern)
        
        # Add severity score and wrap in color tag
        response['severity_score'] = severity_score
        response['severity_tag'] = severity_tag
        
        # Wrap the response text in the appropriate color tag
        original_response = response.get('response', '')
        response['response'] = f"<{severity_tag}>\nSeverity Score: {severity_score}/10\n\n{original_response}\n</{severity_tag}>"
        
        return response
    
    def _generate_input_collection_response(self, missing: List[str], patient_data: Dict[str, Any]) -> Dict[str, Any]:
        """Generate response to collect missing inputs"""
        questions = []
        
        if 'age' in missing:
            questions.append("What is your age (or the patient's age)?")
        if 'temperature' in missing:
            questions.append("What is the current temperature? Please specify in Fahrenheit or Celsius.")
        if 'duration' in missing:
            questions.append("How long has the fever been present? (hours or days)")
        if 'symptoms' in missing:
            questions.append("What other symptoms are you experiencing? (e.g., cough, headache, body pain, rash, etc.)")
        if 'hydration status' in missing:
            questions.append("How is the hydration status? Are you drinking fluids normally?")
        
        # Check for additional context needed
        if not patient_data.get('is_pregnant') and patient_data.get('age') and 15 <= patient_data.get('age', 0) <= 50:
            questions.append("Are you pregnant? (if applicable)")
        
        if not patient_data.get('chronic_conditions'):
            questions.append("Do you have any chronic medical conditions? (e.g., diabetes, hypertension)")
        
        if not patient_data.get('mosquito_exposure') and not patient_data.get('recent_travel'):
            questions.append("Have you been exposed to mosquitoes or traveled recently?")
        
        if not patient_data.get('medicines_taken'):
            questions.append("What medicines have you already taken for the fever?")
        
        response_text = "To provide you with the best guidance, I need some additional information:\n\n"
        for i, q in enumerate(questions[:5], 1):  # Limit to 5 questions
            response_text += f"{i}. {q}\n"
        
        response_text += f"\n{self.SAFETY_DISCLAIMER}"
        
        return {
            'response': response_text,
            'triage_level': 'collecting_inputs',
            'missing_inputs': missing,
            'patient_data': patient_data,
            'needs_followup': True
        }
    
    def _generate_red_flag_response(self, red_flags: List[str], patient_data: Dict[str, Any], fever_pattern: str) -> Dict[str, Any]:
        """Generate response for red flag (emergency) cases"""
        response_text = "🚨 **URGENT MEDICAL ATTENTION REQUIRED**\n\n"
        
        response_text += "Based on the symptoms you've described, this requires **immediate medical evaluation**.\n\n"
        
        response_text += "**Red Flags Detected:**\n"
        for flag in red_flags:
            response_text += f"• {flag}\n"
        
        response_text += "\n**Immediate Actions:**\n"
        response_text += "1. **Seek emergency medical care immediately** - Go to the nearest emergency room or call emergency services.\n"
        response_text += "2. Do not delay - these symptoms require urgent professional evaluation.\n"
        response_text += "3. If you're alone, ask someone to accompany you or call for help.\n"
        
        # Add pattern-specific guidance
        if fever_pattern == "dengue-like":
            response_text += "\n**Note:** Your symptoms may indicate dengue fever, which requires immediate medical attention.\n"
        elif patient_data.get('is_infant'):
            response_text += "\n**Note:** Infants under 3 months with fever require immediate medical evaluation.\n"
        
        response_text += f"\n{self.SAFETY_DISCLAIMER}"
        
        return {
            'response': response_text,
            'triage_level': 'RED',
            'red_flags': red_flags,
            'fever_pattern': fever_pattern,
            'patient_data': patient_data,
            'needs_followup': False,
            'escalation': 'emergency_care'
        }
    
    def _generate_yellow_flag_response(self, yellow_flags: List[str], patient_data: Dict[str, Any], fever_pattern: str) -> Dict[str, Any]:
        """Generate response for yellow flag (doctor visit) cases"""
        response_text = "⚠️ **RECOMMENDED: SEE A DOCTOR WITHIN 24-48 HOURS**\n\n"
        
        response_text += "Based on your symptoms, I recommend consulting a healthcare professional.\n\n"
        
        response_text += "**Concerns Identified:**\n"
        for flag in yellow_flags:
            response_text += f"• {flag}\n"
        
        response_text += "\n**Home Care (Until You See a Doctor):**\n"
        response_text += "1. **Stay hydrated** - Drink plenty of fluids (water, oral rehydration solution)\n"
        response_text += "2. **Rest** - Get adequate rest to help your body recover\n"
        response_text += "3. **Monitor temperature** - Check temperature every 4-6 hours\n"
        response_text += "4. **Light clothing** - Wear light, breathable clothing\n"
        response_text += "5. **Comfortable environment** - Keep room temperature comfortable\n"
        
        # Medicine suggestions (OTC only)
        temp = patient_data.get('temperature')
        age = patient_data.get('age', 0)
        medicines_taken = patient_data.get('medicines_taken', [])
        
        response_text += "\n**Medicine Suggestions (OTC Only):**\n"
        if temp and temp > 100.4:  # >100.4°F
            if 'paracetamol' not in ' '.join(medicines_taken).lower() and 'acetaminophen' not in ' '.join(medicines_taken).lower():
                if age >= 2:
                    response_text += "• **Paracetamol (Acetaminophen)**: Follow dosage instructions based on age/weight\n"
                else:
                    response_text += "• **Paracetamol (Acetaminophen)**: Consult doctor for proper dosage for children under 2\n"
            
            if age >= 6 and 'ibuprofen' not in ' '.join(medicines_taken).lower():
                response_text += "• **Ibuprofen**: Can be used as alternative (not for children under 6 months)\n"
        
        response_text += "\n**When to Seek Immediate Care:**\n"
        response_text += "• If symptoms worsen\n"
        response_text += "• If new symptoms appear\n"
        response_text += "• If temperature rises above 103°F (39.4°C)\n"
        response_text += "• If you develop difficulty breathing, confusion, or severe pain\n"
        
        # Pattern-specific guidance
        if fever_pattern == "dengue-like":
            response_text += "\n**Note:** Your symptoms may suggest dengue fever. Please see a doctor for proper evaluation and monitoring.\n"
        elif fever_pattern == "malaria-like":
            response_text += "\n**Note:** Your symptoms may suggest malaria. Please see a doctor for proper testing and treatment.\n"
        elif fever_pattern == "typhoid-like":
            response_text += "\n**Note:** Your symptoms may suggest typhoid fever. Please see a doctor for proper evaluation.\n"
        
        response_text += f"\n{self.SAFETY_DISCLAIMER}"
        
        return {
            'response': response_text,
            'triage_level': 'YELLOW',
            'yellow_flags': yellow_flags,
            'fever_pattern': fever_pattern,
            'patient_data': patient_data,
            'needs_followup': True,
            'followup_hours': 4,
            'escalation': 'doctor_consultation'
        }
    
    def _generate_green_flag_response(self, patient_data: Dict[str, Any], fever_pattern: str) -> Dict[str, Any]:
        """Generate response for green flag (home care) cases"""
        response_text = "✅ **HOME CARE RECOMMENDED**\n\n"
        
        response_text += "Based on your symptoms, home care with monitoring is appropriate.\n\n"
        
        temp = patient_data.get('temperature')
        duration = patient_data.get('duration_hours', 0)
        age = patient_data.get('age', 0)
        
        response_text += "**Home Care Instructions:**\n"
        response_text += "1. **Hydration** - Drink plenty of fluids (water, oral rehydration solution, clear soups)\n"
        response_text += "2. **Rest** - Get adequate rest to help your body fight the infection\n"
        response_text += "3. **Light clothing** - Wear light, breathable clothing\n"
        response_text += "4. **Comfortable environment** - Keep room temperature comfortable, use a fan if needed\n"
        response_text += "5. **Monitor symptoms** - Keep track of temperature and any new symptoms\n"
        
        # Medicine suggestions
        medicines_taken = patient_data.get('medicines_taken', [])
        response_text += "\n**Medicine Suggestions (OTC Only):**\n"
        
        if temp and temp > 100.4:  # >100.4°F
            if 'paracetamol' not in ' '.join(medicines_taken).lower() and 'acetaminophen' not in ' '.join(medicines_taken).lower():
                if age >= 2:
                    response_text += "• **Paracetamol (Acetaminophen)**: \n"
                    response_text += "  - Adults: 500-1000mg every 4-6 hours (max 4g/day)\n"
                    response_text += "  - Children: Follow weight-based dosing (consult package instructions)\n"
                else:
                    response_text += "• **Paracetamol (Acetaminophen)**: Consult doctor for proper dosage for children under 2\n"
            
            if age >= 6 and 'ibuprofen' not in ' '.join(medicines_taken).lower():
                response_text += "• **Ibuprofen**: \n"
                response_text += "  - Adults: 200-400mg every 4-6 hours (max 1200mg/day)\n"
                response_text += "  - Children 6+ months: Follow weight-based dosing\n"
                response_text += "  - Do not use for children under 6 months\n"
        
        response_text += "\n**Monitoring Recommendations:**\n"
        response_text += "• Check temperature every 4-6 hours\n"
        response_text += "• Monitor for new symptoms\n"
        response_text += "• Ensure adequate fluid intake\n"
        response_text += "• Watch for signs of dehydration\n"
        
        response_text += "\n**When to Seek Medical Care:**\n"
        response_text += "• If fever persists for more than 3 days\n"
        response_text += "• If temperature rises above 103°F (39.4°C)\n"
        response_text += "• If symptoms worsen or new symptoms appear\n"
        response_text += "• If you develop difficulty breathing, confusion, severe pain, or rash\n"
        response_text += "• If you're unable to keep fluids down\n"
        
        # Pattern-specific guidance
        if fever_pattern == "viral":
            response_text += "\n**Note:** Your symptoms suggest a viral infection. Most viral fevers resolve within 3-5 days with proper home care.\n"
        elif fever_pattern == "heat_dehydration_fever":
            response_text += "\n**Note:** Your symptoms may be related to heat or dehydration. Focus on staying hydrated and cool.\n"
        
        response_text += f"\n{self.SAFETY_DISCLAIMER}"
        
        return {
            'response': response_text,
            'triage_level': 'GREEN',
            'fever_pattern': fever_pattern,
            'patient_data': patient_data,
            'needs_followup': True,
            'followup_hours': 6,
            'escalation': None
        }
    
    def generate_followup_prompt(self, patient_data: Dict[str, Any], hours_since: int) -> str:
        """Generate follow-up questions after specified hours"""
        prompt = f"It's been approximately {hours_since} hours since your last update. Let's check on your condition:\n\n"
        prompt += "Please provide:\n"
        prompt += "1. Current temperature\n"
        prompt += "2. Any new symptoms that have appeared\n"
        prompt += "3. Hydration status (are you drinking fluids normally?)\n"
        prompt += "4. Overall condition (better, same, or worse?)\n"
        
        return prompt

