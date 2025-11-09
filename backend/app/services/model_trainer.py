"""
Model Training Service

This service handles:
1. Processing and cleaning the medical data
2. Creating embeddings for symptoms and diseases
3. Training classifiers for symptom analysis
4. Fine-tuning conversation patterns
"""

import numpy as np
from pathlib import Path
import json
from typing import Dict, List, Any
from sentence_transformers import SentenceTransformer
from sklearn.ensemble import RandomForestClassifier
import joblib
import os

class ModelTrainer:
    def __init__(self):
        self.data_dir = Path(__file__).parent.parent.parent / 'data'
        self.models_dir = Path(__file__).parent.parent.parent / 'models'
        self.models_dir.mkdir(exist_ok=True)
        
        # Load BERT model for text embeddings
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Initialize classifiers
        self.disease_classifier = RandomForestClassifier(n_estimators=100)
        self.severity_classifier = RandomForestClassifier(n_estimators=100)
        self.emergency_classifier = RandomForestClassifier(n_estimators=100)
        
    def train(self):
        """Train all models and save them"""
        print("Loading data...")
        # Load knowledge base data
        symptom_disease_data = self._load_json('knowledge_base/symptom_disease_dataset.json')
        symptom_severity = self._load_json('knowledge_base/symptom_severity.json')
        fever_data = self._load_json('knowledge_base/fever_dataset.json')
        fever_symptoms = self._load_json('knowledge_base/fever_symptoms.json')
        medicine_data = self._load_json('knowledge_base/medical_medicine_dataset.json')
        symptom_descriptions = self._load_json('knowledge_base/symptom_description.json')
        symptom_precautions = self._load_json('knowledge_base/symptom_precaution.json')

        # Load decision trees data
        emergency_markers = self._load_json('decision_trees/emergency_markers.json')
        risk_assessment = self._load_json('decision_trees/risk_assessment.json')
        treatment_flow = self._load_json('decision_trees/treatment_decision_flow.json')
        triage_protocol = self._load_json('decision_trees/triage_protocol.json')

        # Load training conversations
        sample_consultations = self._load_json('training_conversations/sample_consultations.json')
        common_questions = self._load_json('training_conversations/common_questions.json')
        patient_descriptions = self._load_json('training_conversations/patient_descriptions.json')

        print("Processing training data...")
        # Enhance disease training data with fever-specific information
        X_disease, y_disease = self._prepare_disease_training_data(
            symptom_disease_data,
            fever_data,
            fever_symptoms
        )
        
        # Process severity training data with enhanced context
        X_severity, y_severity = self._prepare_severity_training_data(
            symptom_severity,
            symptom_descriptions,
            risk_assessment
        )
        
        # Process emergency training data with comprehensive risk assessment
        X_emergency, y_emergency = self._prepare_emergency_training_data(
            emergency_markers,
            sample_consultations,
            triage_protocol,
            risk_assessment
        )
        
        print("Training classifiers...")
        # Train disease classifier
        self.disease_classifier.fit(X_disease, y_disease)
        
        # Train severity classifier
        self.severity_classifier.fit(X_severity, y_severity)
        
        # Train emergency classifier
        self.emergency_classifier.fit(X_emergency, y_emergency)
        
        print("Creating embeddings for knowledge base...")
        # Create embeddings for symptoms and diseases
        symptom_embeddings = self._create_symptom_embeddings(symptom_disease_data)
        disease_embeddings = self._create_disease_embeddings(symptom_disease_data)
        
        print("Saving models and embeddings...")
        # Save all models and embeddings
        self._save_models()
        self._save_embeddings(symptom_embeddings, disease_embeddings)
        
        print("Training complete!")
        
    def _load_json(self, relative_path: str) -> Dict:
        """Load JSON file from data directory"""
        try:
            with open(self.data_dir / relative_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except FileNotFoundError:
            print(f"Warning: {relative_path} not found")
            return {}
            
    def _prepare_disease_training_data(self, symptom_disease_data: Dict,
                                    fever_data: Dict, fever_symptoms: Dict) -> tuple:
        """Prepare training data for disease classification"""
        X, y = [], []
        
        # Process general symptom-disease data
        for entry in symptom_disease_data.get('symptom_disease_data', []):
            symptoms = entry.get('symptoms', [])
            disease = entry.get('disease')
            
            if symptoms and disease:
                # Create embedding for symptoms
                symptoms_text = ' '.join(symptoms)
                symptom_embedding = self.embedding_model.encode([symptoms_text])[0]
                
                X.append(symptom_embedding)
                y.append(disease)
        
        # Process fever-specific data
        for entry in (fever_data if isinstance(fever_data, list) else fever_data.get('fever_cases', [])):
            symptoms = []
            
            # Map fever data fields to symptoms
            symptom_mapping = {
                'Headache': 'headache',
                'Body_Ache': 'body_ache',
                'Fatigue': 'fatigue',
                'Chills': 'chills',
                'Nausea': 'nausea',
                'Dizziness': 'dizziness',
                'Cough': 'cough',
                'Sore_Throat': 'sore_throat',
                'Runny_Nose': 'runny_nose',
                'Muscle_Pain': 'muscle_pain'
            }
            
            for field, symptom in symptom_mapping.items():
                if entry.get(field) == 'Yes':
                    symptoms.append(symptom)
            
            temperature = entry.get('Temperature')
            if temperature:
                # Classify fever severity based on temperature
                if float(temperature) >= 103:
                    severity = 'High_Fever'
                elif float(temperature) >= 101:
                    severity = 'Moderate_Fever'
                else:
                    severity = 'Mild_Fever'
                
                # Add temperature-related symptoms
                symptoms.append(f'temperature_{temperature}')
                symptoms.append(severity.lower())
            
            if symptoms:  # Only add if we have symptoms
                symptoms_text = ' '.join(symptoms)
                symptom_embedding = self.embedding_model.encode([symptoms_text])[0]
                X.append(symptom_embedding)
                y.append(entry.get('Diagnosis', 'Unknown_Fever'))
        
        # Process additional fever symptoms data
        if fever_symptoms.get('fever_symptoms'):
            for symptom_group in fever_symptoms.get('fever_symptoms'):
                if isinstance(symptom_group, dict):
                    condition = symptom_group.get('condition')
                    symptoms = symptom_group.get('symptoms', [])
                    
                    if condition and symptoms:
                        symptoms_text = ' '.join(symptoms)
                        symptom_embedding = self.embedding_model.encode([symptoms_text])[0]
                        X.append(symptom_embedding)
                        y.append(condition)
        
        return np.array(X), np.array(y)

    def _prepare_severity_training_data(self, symptom_severity: Dict, 
                                    symptom_descriptions: Dict,
                                    risk_assessment: Dict) -> tuple:
        """Prepare training data for severity classification"""
        X, y = [], []
        
        # Process basic severity data
        for data in symptom_severity.get('symptom_severity', []):
            symptom = data.get('symptom')
            severity = data.get('severity_weight', 1)
            
            # Get additional context from symptom descriptions
            description = next(
                (desc.get('description', '') 
                 for desc in symptom_descriptions.get('symptoms', [])
                 if desc.get('name') == symptom),
                ''
            )
            
            # Create embedding for symptom with description
            text = f"{symptom} {description}"
            symptom_embedding = self.embedding_model.encode([text])[0]
            
            X.append(symptom_embedding)
            y.append(severity)
            
        # Add risk assessment data
        for risk_factor in risk_assessment.get('risk_factors', []):
            condition = risk_factor.get('condition')
            risk_level = risk_factor.get('risk_level', 1)
            
            # Create embedding for risk condition
            risk_embedding = self.embedding_model.encode([condition])[0]
            
            X.append(risk_embedding)
            y.append(risk_level)
            
        return np.array(X), np.array(y)
        
    def _prepare_emergency_training_data(self, emergency_markers: Dict,
                                    sample_consultations: Dict,
                                    triage_protocol: Dict,
                                    risk_assessment: Dict) -> tuple:
        """Prepare training data for emergency classification"""
        X, y = [], []
        
        # Add emergency cases from markers
        emergency_symptoms = emergency_markers.get('emergency_symptoms', [])
        for symptom in emergency_symptoms:
            symptom_embedding = self.embedding_model.encode([symptom])[0]
            X.append(symptom_embedding)
            y.append(1)  # Emergency
            
        # Add triage protocol data
        for protocol in triage_protocol.get('protocols', []):
            conditions = protocol.get('conditions', [])
            priority = protocol.get('priority', 'non-emergency')
            
            conditions_text = ' '.join(conditions)
            condition_embedding = self.embedding_model.encode([conditions_text])[0]
            
            X.append(condition_embedding)
            y.append(1 if priority in ['immediate', 'emergency'] else 0)
            
        # Add risk assessment cases
        for risk in risk_assessment.get('risk_factors', []):
            condition = risk.get('condition')
            risk_level = risk.get('risk_level', 1)
            
            condition_embedding = self.embedding_model.encode([condition])[0]
            X.append(condition_embedding)
            y.append(1 if risk_level >= 6 else 0)  # High risk levels are emergencies
            
        # Add cases from sample consultations
        for consult in sample_consultations.get('conversations', []):
            symptoms = consult.get('symptoms', [])
            is_emergency = consult.get('is_emergency', False)
            
            symptoms_text = ' '.join(symptoms)
            symptom_embedding = self.embedding_model.encode([symptoms_text])[0]
            
            X.append(symptom_embedding)
            y.append(1 if is_emergency else 0)
            
        return np.array(X), np.array(y)
        
    def _create_symptom_embeddings(self, symptom_disease_data: Dict) -> Dict:
        """Create embeddings for all symptoms"""
        symptoms = set()
        for entry in symptom_disease_data.get('symptom_disease_data', []):
            symptoms.update(entry.get('symptoms', []))
            
        return {
            symptom: self.embedding_model.encode([symptom])[0]
            for symptom in symptoms
        }
        
    def _create_disease_embeddings(self, symptom_disease_data: Dict) -> Dict:
        """Create embeddings for all diseases"""
        diseases = set(
            entry.get('disease')
            for entry in symptom_disease_data.get('symptom_disease_data', [])
        )
        
        return {
            disease: self.embedding_model.encode([disease])[0]
            for disease in diseases
        }
        
    def _save_models(self):
        """Save trained models"""
        joblib.dump(self.disease_classifier, self.models_dir / 'disease_classifier.joblib')
        joblib.dump(self.severity_classifier, self.models_dir / 'severity_classifier.joblib')
        joblib.dump(self.emergency_classifier, self.models_dir / 'emergency_classifier.joblib')
        
    def _save_embeddings(self, symptom_embeddings: Dict, disease_embeddings: Dict):
        """Save computed embeddings"""
        np.save(self.models_dir / 'symptom_embeddings.npy', symptom_embeddings)
        np.save(self.models_dir / 'disease_embeddings.npy', disease_embeddings)