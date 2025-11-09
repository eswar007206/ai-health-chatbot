"""
Medical Knowledge Base Service

This service loads and manages all medical data including:
1. Knowledge Base (symptoms, diseases, medicines)
2. Decision Trees (triage, risk assessment)
3. Training Conversations (sample consultations, common questions)
"""

import json
import os
from typing import Dict, List, Any, Optional
from pathlib import Path

class MedicalKnowledgeBase:
    def __init__(self):
        self.data_dir = Path(__file__).parent.parent.parent / 'data'
        self.knowledge_base_dir = self.data_dir / 'knowledge_base'
        self.decision_trees_dir = self.data_dir / 'decision_trees'
        self.training_data_dir = self.data_dir / 'training_conversations'
        
        # Load Knowledge Base
        self.symptom_disease_data = self._load_json('knowledge_base/symptom_disease_dataset.json')
        self.symptom_severity = self._load_json('knowledge_base/symptom_severity.json')
        self.symptom_precautions = self._load_json('knowledge_base/symptom_precaution.json')
        self.symptom_descriptions = self._load_json('knowledge_base/symptom_description.json')
        self.medicine_data = self._load_json('knowledge_base/medical_medicine_dataset.json')
        self.fever_symptoms = self._load_json('knowledge_base/fever_symptoms.json')
        self.fever_dataset = self._load_json('knowledge_base/fever_dataset.json')
        
        # Load Decision Trees
        self.triage_protocol = self._load_json('decision_trees/triage_protocol.json')
        self.risk_assessment = self._load_json('decision_trees/risk_assessment.json')
        self.emergency_markers = self._load_json('decision_trees/emergency_markers.json')
        self.treatment_flow = self._load_json('decision_trees/treatment_decision_flow.json')
        
        # Load Training Conversations
        self.sample_consultations = self._load_json('training_conversations/sample_consultations.json')
        self.common_questions = self._load_json('training_conversations/common_questions.json')
        self.patient_descriptions = self._load_json('training_conversations/patient_descriptions.json')
        
        # Process and index the data
        self._process_data()
    
    def _load_json(self, relative_path: str) -> Dict:
        """Load JSON file from data directory"""
        try:
            with open(self.data_dir / relative_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"Warning: {relative_path} not found")
            return {}
    
    def _process_data(self):
        """Process and index all loaded data for quick access"""
        # Create symptom to disease mapping
        self.symptom_to_diseases = {}
        for entry in self.symptom_disease_data.get('symptom_disease_data', []):
            disease = entry.get('disease')
            symptoms = entry.get('symptoms', [])
            for symptom in symptoms:
                symptom = symptom.strip()
                if symptom not in self.symptom_to_diseases:
                    self.symptom_to_diseases[symptom] = set()
                self.symptom_to_diseases[symptom].add(disease)
        
        # Index training conversations by symptoms
        self.symptom_to_conversations = {}
        for consult in self.sample_consultations.get('conversations', []):
            symptoms = consult.get('symptoms', [])
            for symptom in symptoms:
                if symptom not in self.symptom_to_conversations:
                    self.symptom_to_conversations[symptom] = []
                self.symptom_to_conversations[symptom].append(consult)
    
    def get_similar_cases(self, symptoms: List[str], patient_info: Dict[str, Any]) -> List[Dict]:
        """Find similar cases from training conversations"""
        similar_cases = []
        for symptom in symptoms:
            similar_cases.extend(self.symptom_to_conversations.get(symptom, []))
        
        # Score cases by similarity
        scored_cases = []
        for case in similar_cases:
            score = 0
            case_symptoms = set(case.get('symptoms', []))
            patient_symptoms = set(symptoms)
            
            # Score based on symptom overlap
            common_symptoms = case_symptoms.intersection(patient_symptoms)
            score += len(common_symptoms) * 2
            
            # Score based on patient info match
            case_age_group = case.get('patient_age')
            if case_age_group and patient_info.get('age_years'):
                patient_age = patient_info['age_years']
                if (case_age_group == 'adult' and patient_age >= 18) or \
                   (case_age_group == 'child' and patient_age < 18):
                    score += 1
            
            scored_cases.append((score, case))
        
        # Return top 5 most similar cases
        scored_cases.sort(reverse=True, key=lambda x: x[0])
        return [case for score, case in scored_cases[:5]]
    
    def apply_decision_tree(self, symptoms: List[str], patient_info: Dict[str, Any]) -> Dict[str, Any]:
        """Apply decision trees for triage and treatment decisions"""
        result = {
            'triage_level': None,
            'risk_level': None,
            'emergency_status': False,
            'treatment_path': [],
            'next_steps': []
        }
        
        # Apply triage protocol
        current_node = self.triage_protocol.get('root_node', {})
        while current_node:
            condition = current_node.get('condition', '')
            if self._evaluate_condition(condition, symptoms, patient_info):
                result['triage_level'] = current_node.get('triage_level')
                next_node_id = current_node.get('true_branch')
            else:
                next_node_id = current_node.get('false_branch')
            current_node = self.triage_protocol.get('nodes', {}).get(next_node_id, {})
        
        # Apply risk assessment
        risk_factors = 0
        for risk_factor in self.risk_assessment.get('risk_factors', []):
            if self._evaluate_condition(risk_factor['condition'], symptoms, patient_info):
                risk_factors += risk_factor.get('weight', 1)
        
        result['risk_level'] = 'high' if risk_factors >= 3 else 'medium' if risk_factors >= 1 else 'low'
        
        # Check emergency markers
        emergency_symptoms = set(self.emergency_markers.get('emergency_symptoms', []))
        result['emergency_status'] = any(symptom in emergency_symptoms for symptom in symptoms)
        
        # Determine treatment path
        current_step = self.treatment_flow.get('initial_step')
        while current_step:
            step_data = self.treatment_flow.get('steps', {}).get(current_step, {})
            result['treatment_path'].append(step_data.get('action', ''))
            
            next_step = None
            for condition in step_data.get('next_steps', []):
                if self._evaluate_condition(condition['condition'], symptoms, patient_info):
                    next_step = condition['step']
                    break
            current_step = next_step
        
        return result
    
    def _evaluate_condition(self, condition: str, symptoms: List[str], patient_info: Dict[str, Any]) -> bool:
        """Evaluate a decision tree condition"""
        try:
            # Add variables for condition evaluation
            eval_context = {
                'symptoms': symptoms,
                'patient_info': patient_info,
                'has_symptom': lambda s: s in symptoms,
                'age': patient_info.get('age_years', 0),
                'temperature': patient_info.get('temperature', 37.0)
            }
            return eval(condition, {"__builtins__": {}}, eval_context)
        except:
            return False
    
    def get_diseases_for_symptoms(self, symptoms: List[str]) -> Dict[str, float]:
        """Get possible diseases with confidence scores"""
        disease_scores = {}
        for symptom in symptoms:
            for disease in self.symptom_to_diseases.get(symptom.strip(), []):
                if disease not in disease_scores:
                    disease_scores[disease] = 0
                disease_scores[disease] += 1
        
        # Convert to confidence scores
        max_score = max(disease_scores.values()) if disease_scores else 1
        return {disease: score/max_score for disease, score in disease_scores.items()}
    
    def get_severity_assessment(self, symptoms: List[str]) -> Dict[str, Any]:
        """Assess severity of symptoms"""
        severities = []
        severity_details = {}
        
        # Create a lookup dictionary from symptom_severity list
        severity_lookup = {}
        for item in self.symptom_severity.get('symptom_severity', []):
            symptom_name = item.get('symptom', '').strip().lower()
            severity_weight = item.get('severity_weight', 1)
            severity_lookup[symptom_name] = severity_weight
        
        # Get severity for each symptom
        for symptom in symptoms:
            symptom_lower = symptom.strip().lower()
            severity = severity_lookup.get(symptom_lower, 1)
            severities.append(severity)
            severity_details[symptom] = severity
        
        return {
            'average_severity': sum(severities) / len(severities) if severities else 0,
            'max_severity': max(severities) if severities else 0,
            'severity_details': severity_details
        }
    
    def get_treatment_recommendations(self, symptoms: List[str], diseases: List[str],
                                   severity: float, is_emergency: bool) -> List[str]:
        """Get treatment recommendations based on all available data"""
        recommendations = set()
        
        # Add disease-specific recommendations
        for disease in diseases:
            disease_recs = self.medicine_data.get(disease, {}).get('recommendations', [])
            recommendations.update(disease_recs)
        
        # Add symptom-specific precautions
        for symptom in symptoms:
            precautions = self.symptom_precautions.get(symptom.strip(), {}).get('precautions', [])
            recommendations.update(precautions)
        
        # Add severity-based recommendations
        if severity >= 7:
            recommendations.add("Seek immediate medical attention")
        elif severity >= 5:
            recommendations.add("Consult a healthcare provider within 24 hours")
        
        # Add emergency recommendations
        if is_emergency:
            recommendations.update([
                "Go to the nearest emergency room",
                "Call emergency services if symptoms worsen"
            ])
        
        return list(recommendations)
    
    def get_symptom_description(self, symptom: str) -> str:
        """Get description for a symptom"""
        symptom = symptom.strip().lower()
        for desc in self.symptom_descriptions.get('symptoms', []):
            if desc.get('name', '').strip().lower() == symptom:
                return desc.get('description', '')
        return ''
    
    def get_precautions_for_symptoms(self, symptoms: List[str]) -> List[str]:
        """Get precautions for given symptoms"""
        precautions = set()
        for symptom in symptoms:
            symptom = symptom.strip().lower()
            # Check symptom_precautions structure
            for item in self.symptom_precautions.get('symptom_precautions', []):
                if item.get('symptom', '').strip().lower() == symptom:
                    precautions.update(item.get('precautions', []))
        return list(precautions)
    
    def get_medicine_info(self, medicine_name: str) -> Optional[Dict]:
        """Get medicine information"""
        for med in self.medicine_data.get('medicines', []):
            if med.get('name', '').lower() == medicine_name.lower():
                return med
        return None
    
    def format_for_prompt(self, symptoms: List[str], patient_info: Dict[str, Any]) -> str:
        """Format all medical knowledge as context for AI prompt"""
        # Get various analyses
        diseases = self.get_diseases_for_symptoms(symptoms)
        severity = self.get_severity_assessment(symptoms)
        decision_tree_results = self.apply_decision_tree(symptoms, patient_info)
        similar_cases = self.get_similar_cases(symptoms, patient_info)
        
        # Get recommendations
        recommendations = self.get_treatment_recommendations(
            symptoms,
            list(diseases.keys()),
            severity['average_severity'],
            decision_tree_results['emergency_status']
        )
        
        context = f"""
Medical Analysis Summary:
------------------------
Symptoms Reported: {', '.join(symptoms)}

Possible Conditions (with confidence):
{chr(10).join([f'- {disease} ({conf:.2%})' for disease, conf in diseases.items()])}

Severity Assessment:
- Average Severity: {severity['average_severity']:.1f}/10
- Maximum Severity: {severity['max_severity']}/10
- Details: {severity['severity_details']}

Decision Tree Analysis:
- Triage Level: {decision_tree_results['triage_level']}
- Risk Level: {decision_tree_results['risk_level']}
- Emergency Status: {decision_tree_results['emergency_status']}
- Treatment Path: {' -> '.join(decision_tree_results['treatment_path'])}

Similar Cases from Database:
{chr(10).join([f"- Case {i+1}: {case.get('initial_complaint')} ({case.get('final_recommendation')})" 
              for i, case in enumerate(similar_cases)])}

Patient Information:
{chr(10).join([f'- {k}: {v}' for k,v in patient_info.items()])}

Initial Recommendations:
{chr(10).join([f'- {r}' for r in recommendations])}
        """
        
        return context.strip()
    
    def get_all_knowledge_context(self) -> str:
        """Get a comprehensive summary of all knowledge base data for context"""
        context_parts = []
        
        # Knowledge Base Summary
        symptom_count = len(self.symptom_to_diseases)
        disease_count = len(set().union(*self.symptom_to_diseases.values())) if self.symptom_to_diseases else 0
        context_parts.append(f"Knowledge Base: {symptom_count} symptoms mapped to {disease_count} diseases")
        
        # Decision Trees Summary
        if self.triage_protocol:
            context_parts.append("Triage protocols available")
        if self.emergency_markers:
            emergency_count = len(self.emergency_markers.get('emergency_symptoms', []))
            context_parts.append(f"{emergency_count} emergency markers defined")
        
        # Training Data Summary
        consultation_count = len(self.sample_consultations.get('conversations', []))
        context_parts.append(f"{consultation_count} sample consultations available")
        
        return "; ".join(context_parts)