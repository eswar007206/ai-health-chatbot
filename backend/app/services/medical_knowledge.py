"""
Medical Knowledge Base Management
"""
import json
import os
from pathlib import Path

class MedicalKnowledgeBase:
    def __init__(self):
        self.base_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'data')
        self.data = {}
        self.load_knowledge_base()

    def load_knowledge_base(self):
        """Load all JSON files from knowledge_base directory"""
        knowledge_path = os.path.join(self.base_path, 'knowledge_base')
        conversation_path = os.path.join(self.base_path, 'training_conversations')
        decision_path = os.path.join(self.base_path, 'decision_trees')

        # Load knowledge base files
        self.data['symptom_disease'] = self._load_json(os.path.join(knowledge_path, 'symptom_disease_dataset.json'))
        self.data['symptom_severity'] = self._load_json(os.path.join(knowledge_path, 'symptom_severity.json'))
        self.data['symptom_precaution'] = self._load_json(os.path.join(knowledge_path, 'symptom_precaution.json'))
        self.data['symptom_description'] = self._load_json(os.path.join(knowledge_path, 'symptom_description.json'))
        self.data['fever_symptoms'] = self._load_json(os.path.join(knowledge_path, 'fever_symptoms.json'))
        self.data['medicine'] = self._load_json(os.path.join(knowledge_path, 'medical_medicine_dataset.json'))
        self.data['fever_dataset'] = self._load_json(os.path.join(knowledge_path, 'fever_dataset.json'))

        # Load conversation examples
        self.data['sample_consultations'] = self._load_json(os.path.join(conversation_path, 'sample_consultations.json'))
        self.data['patient_descriptions'] = self._load_json(os.path.join(conversation_path, 'patient_descriptions.json'))
        self.data['common_questions'] = self._load_json(os.path.join(conversation_path, 'common_questions.json'))

        # Load decision trees
        self.data['triage_protocol'] = self._load_json(os.path.join(decision_path, 'triage_protocol.json'))
        self.data['risk_assessment'] = self._load_json(os.path.join(decision_path, 'risk_assessment.json'))
        self.data['emergency_markers'] = self._load_json(os.path.join(decision_path, 'emergency_markers.json'))
        self.data['treatment_flow'] = self._load_json(os.path.join(decision_path, 'treatment_decision_flow.json'))

    def _load_json(self, path):
        """Load a JSON file and return its contents"""
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError) as e:
            print(f"Error loading {path}: {str(e)}")
            return {}

    def get_diseases_for_symptoms(self, symptoms):
        """Get possible diseases based on symptoms"""
        diseases = {}
        for item in self.data['symptom_disease'].get('symptom_disease_data', []):
            matching_symptoms = set(symptoms) & set(s.strip() for s in item.get('symptoms', []))
            if matching_symptoms:
                disease = item['disease']
                if disease not in diseases:
                    diseases[disease] = len(matching_symptoms)
                else:
                    diseases[disease] = max(diseases[disease], len(matching_symptoms))
        
        # Sort by number of matching symptoms
        return dict(sorted(diseases.items(), key=lambda x: x[1], reverse=True))

    def get_severity_assessment(self, symptoms):
        """Get severity assessment for given symptoms"""
        severity_data = self.data['symptom_severity']
        total_severity = 0
        assessments = []
        
        for symptom in symptoms:
            symptom = symptom.strip()
            severity = next((item['severity'] for item in severity_data.get('severity_data', []) 
                           if item['symptom'].strip() == symptom), 0)
            total_severity += severity
            assessments.append({
                'symptom': symptom,
                'severity': severity
            })
        
        return {
            'total_severity': total_severity,
            'average_severity': total_severity / len(symptoms) if symptoms else 0,
            'assessments': assessments
        }

    def get_precautions(self, symptoms, diseases):
        """Get precautions for given symptoms and diseases"""
        precautions = set()
        precaution_data = self.data['symptom_precaution']
        
        # Add symptom-specific precautions
        for item in precaution_data.get('symptom_precautions', []):
            if item['symptom'].strip() in symptoms:
                precautions.update(item['precautions'])
        
        # Add disease-specific precautions
        for item in precaution_data.get('disease_precautions', []):
            if item['disease'] in diseases:
                precautions.update(item['precautions'])
        
        return list(precautions)

    def get_emergency_assessment(self, symptoms, patient_info):
        """Assess if situation is an emergency based on symptoms and patient info"""
        emergency_data = self.data['emergency_markers']
        age = patient_info.get('age', 0)
        temperature = patient_info.get('temperature', 37.0)
        
        emergency_markers = []
        
        # Check temperature thresholds by age
        for threshold in emergency_data.get('temperature_thresholds', []):
            if (threshold['min_age'] <= age <= threshold['max_age'] and 
                temperature >= threshold['critical_temp']):
                emergency_markers.append(f"Critical temperature for age {age}")
        
        # Check critical symptoms
        for symptom in symptoms:
            if symptom in emergency_data.get('critical_symptoms', []):
                emergency_markers.append(f"Critical symptom: {symptom}")
        
        # Check critical combinations
        for combo in emergency_data.get('critical_combinations', []):
            if all(s in symptoms for s in combo['symptoms']):
                emergency_markers.append(combo['reason'])
        
        return {
            'is_emergency': bool(emergency_markers),
            'emergency_markers': emergency_markers
        }

    def get_medicine_info(self, medicine_name):
        """Get detailed information about a medicine"""
        medicine_data = self.data['medicine']
        
        for med in medicine_data.get('medicines', []):
            if med['name'].lower() == medicine_name.lower():
                return med
        
        return None

    def get_treatment_recommendations(self, symptoms, diseases, severity, is_emergency):
        """Get treatment recommendations based on symptoms, diseases, and severity"""
        flow = self.data['treatment_flow']
        recommendations = []
        
        # Get general recommendations based on severity
        severity_level = "low" if severity < 3 else "medium" if severity < 7 else "high"
        recommendations.extend(flow.get(f'{severity_level}_severity_recommendations', []))
        
        # Add disease-specific recommendations
        for disease in diseases:
            recommendations.extend(flow.get(f'{disease}_recommendations', []))
        
        # Add emergency recommendations if needed
        if is_emergency:
            recommendations.extend(flow.get('emergency_recommendations', []))
        
        return list(set(recommendations))  # Remove duplicates

    def get_relevant_cases(self, symptoms, patient_info):
        """Get relevant sample cases from the training data"""
        consultations = self.data['sample_consultations'].get('conversations', [])
        relevant_cases = []
        
        for case in consultations:
            # Check if any symptoms match
            case_symptoms = [s.lower() for s in case.get('symptoms', [])]
            if any(s.lower() in case_symptoms for s in symptoms):
                relevant_cases.append(case)
        
        return relevant_cases[:5]  # Return top 5 most relevant cases