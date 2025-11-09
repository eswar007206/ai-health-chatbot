"""
Symptom Analyzer Service

This module provides functions for analyzing symptoms and determining
disease probabilities and severity levels. Incorporates comprehensive symptom-disease
mapping and can be expanded with ML models for better prediction.
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from enum import Enum
from collections import Counter

class SeverityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class SymptomAnalyzer:
    """
    Analyzes symptoms and provides disease prediction and risk assessment.
    
    Features:
    - Comprehensive symptom-disease mapping
    - Rule-based severity assessment
    - Disease probability prediction
    - Medication suggestions (informational only)
    """

    def __init__(self):
        self.symptom_disease_data = self._load_symptom_disease_data()
        self.disease_symptom_mapping = self._create_disease_symptom_mapping()
        
    def _load_symptom_disease_data(self) -> Dict:
        """Load symptom-disease dataset from JSON file."""
        data_path = Path(__file__).parents[2] / "data" / "knowledge_base" / "symptom_disease_dataset.json"
        try:
            with open(data_path, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Warning: Could not load symptom-disease data: {e}")
            return {"symptom_disease_data": []}
            
    def _create_disease_symptom_mapping(self) -> Dict[str, List[str]]:
        """Create a mapping of diseases to their common symptoms."""
        mapping = {}
        for entry in self.symptom_disease_data.get("symptom_disease_data", []):
            disease = entry["disease"]
            symptoms = [s.strip() for s in entry["symptoms"]]
            if disease in mapping:
                # Add new symptoms to the existing list
                mapping[disease] = list(set(mapping[disease] + symptoms))
            else:
                mapping[disease] = symptoms
        return mapping
        
    def analyze_symptoms(self, symptoms: List[str]) -> Dict:
        """
        Analyze given symptoms and return possible diseases with their probabilities.
        
        Args:
            symptoms: List of reported symptoms
            
        Returns:
            Dictionary with predicted diseases and their confidence scores
        """
        symptoms = [s.strip().lower() for s in symptoms]
        disease_scores = {}
        
        for disease, disease_symptoms in self.disease_symptom_mapping.items():
            # Convert to set for faster intersection
            disease_symptoms_set = {s.strip().lower() for s in disease_symptoms}
            matching_symptoms = set(symptoms) & disease_symptoms_set
            
            if matching_symptoms:
                # Calculate confidence score based on:
                # 1. Number of matching symptoms
                # 2. Ratio of matched symptoms to total disease symptoms
                match_count = len(matching_symptoms)
                coverage_ratio = match_count / len(disease_symptoms_set)
                confidence_score = (match_count * 0.6 + coverage_ratio * 0.4) * 100
                
                disease_scores[disease] = {
                    "confidence": round(confidence_score, 2),
                    "matching_symptoms": list(matching_symptoms),
                    "missing_symptoms": list(disease_symptoms_set - set(symptoms))
                }
        
        # Sort diseases by confidence score
        sorted_diseases = sorted(
            disease_scores.items(), 
            key=lambda x: x[1]["confidence"], 
            reverse=True
        )
        
        return {
            "predictions": [{
                "disease": disease,
                **scores
            } for disease, scores in sorted_diseases[:5]],  # Return top 5 predictions
            "total_diseases_analyzed": len(self.disease_symptom_mapping)
        }
    
    def analyze_fever(
        self,
        temperature: float,
        duration_hours: int,
        age_years: Optional[int] = None,
        additional_symptoms: Optional[List[str]] = None
    ) -> Dict:
        """
        Analyze fever symptoms, predict possible diseases, and return severity assessment.
        
        Args:
            temperature: Body temperature in Fahrenheit
            duration_hours: How long the fever has lasted
            age_years: Patient's age (optional)
            additional_symptoms: List of other symptoms (optional)
            
        Returns:
            Dictionary with disease predictions, severity level, and recommendations
        """
        severity = SeverityLevel.LOW
        warnings = []
        recommendations = []
        
        # Temperature-based assessment
        if temperature >= 103.0:
            severity = SeverityLevel.HIGH
            warnings.append("Very high fever detected")
        elif temperature >= 101.0:
            severity = SeverityLevel.MEDIUM
        
        # Duration-based assessment
        if duration_hours > 72:
            severity = SeverityLevel.HIGH
            warnings.append("Prolonged fever duration")
        
        # Age-based considerations
        if age_years is not None:
            if age_years < 0.25:  # Less than 3 months
                severity = SeverityLevel.URGENT
                warnings.append("Infant with fever - immediate medical attention required")
            elif age_years < 2:
                if temperature >= 102.0:
                    severity = SeverityLevel.HIGH
        
        # Build symptom list
        symptoms = ["high_fever"]  # Base symptom
        if temperature >= 103.0:
            symptoms.append("very_high_fever")
        if temperature >= 101.0 and temperature < 103.0:
            symptoms.append("mild_fever")
            
        if additional_symptoms:
            symptoms.extend(additional_symptoms)
            
            # Check for urgent symptoms
            urgent_symptoms = [
                "difficulty breathing",
                "chest pain",
                "confusion",
                "severe headache",
                "stiff neck",
                "rash",
                "persistent vomiting"
            ]
            
            for symptom in additional_symptoms:
                if any(urgent in symptom.lower() for urgent in urgent_symptoms):
                    severity = SeverityLevel.URGENT
                    warnings.append(f"Urgent symptom detected: {symptom}")
        
        # Get disease predictions
        disease_predictions = self.analyze_symptoms(symptoms)
        
        # Generate recommendations
        if severity == SeverityLevel.URGENT:
            recommendations.append("Seek immediate medical attention")
        elif severity == SeverityLevel.HIGH:
            recommendations.append("Consult a healthcare provider within 24 hours")
        else:
            recommendations.extend([
                "Stay hydrated",
                "Get plenty of rest",
                "Take fever-reducing medication as appropriate",
                "Monitor temperature regularly"
            ])
            
        # Add disease-specific recommendations
        if disease_predictions.get("predictions"):
            top_disease = disease_predictions["predictions"][0]
            if top_disease["confidence"] > 70:
                recommendations.append(
                    f"Consider getting tested for {top_disease['disease']} "
                    f"(confidence: {top_disease['confidence']}%)"
                )
                if top_disease["missing_symptoms"]:
                    recommendations.append(
                        "Monitor for additional symptoms: " + 
                        ", ".join(top_disease["missing_symptoms"][:3])
                    )
        
        return {
            "severity": severity.value,
            "temperature": temperature,
            "duration_hours": duration_hours,
            "warnings": warnings,
            "recommendations": recommendations,
            "disease_predictions": disease_predictions["predictions"],
            "analysis_coverage": {
                "diseases_analyzed": disease_predictions["total_diseases_analyzed"],
                "symptoms_considered": len(symptoms)
            }
        }
    
    @staticmethod
    def suggest_medication(
        age_years: int,
        weight_kg: Optional[float] = None,
        allergies: Optional[List[str]] = None
    ) -> Dict:
        """
        Suggest appropriate fever medication based on patient details.
        
        Note: This is for informational purposes only. Always consult
        a healthcare provider before taking medication.
        """
        suggestions = []
        warnings = []
        
        if age_years < 0.5:
            warnings.append("For infants, consult pediatrician before giving medication")
            return {"suggestions": [], "warnings": warnings}
        
        # Basic medication suggestions (informational only)
        if age_years >= 18:
            suggestions.append({
                "name": "Acetaminophen (Tylenol)",
                "dosage": "500-1000mg every 4-6 hours",
                "max_daily": "4000mg"
            })
            suggestions.append({
                "name": "Ibuprofen (Advil)",
                "dosage": "200-400mg every 4-6 hours",
                "max_daily": "1200mg"
            })
        elif age_years >= 12:
            suggestions.append({
                "name": "Acetaminophen",
                "dosage": "325-650mg every 4-6 hours",
                "note": "Follow package instructions"
            })
        else:
            suggestions.append({
                "name": "Pediatric acetaminophen",
                "note": "Dosage based on weight - consult pediatrician"
            })
        
        if allergies:
            warnings.append(f"Check medication ingredients against known allergies: {', '.join(allergies)}")
        
        return {
            "suggestions": suggestions,
            "warnings": warnings,
            "disclaimer": "Always consult a healthcare provider before taking medication"
        }
