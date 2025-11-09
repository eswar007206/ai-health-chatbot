# Data Requirements for Fever Helpline AI Model

## Directory Structure
```
data/
├── knowledge_base/          # Medical knowledge and guidelines
├── training_conversations/  # Sample conversations and interactions
└── decision_trees/         # Triage and decision-making protocols
```

## Required Data Files

### 1. Knowledge Base (Put files in `knowledge_base/`)
Required files:
- `fever_symptoms.json` - List of fever symptoms and their characteristics
- `fever_causes.json` - Common causes of fever and their descriptions
- `temperature_guidelines.json` - Temperature ranges and their clinical significance
- `age_specific_guidelines.json` - Age-based fever management guidelines
- `warning_signs.json` - Emergency symptoms and warning signs

Format example for `fever_symptoms.json`:
```json
{
  "symptoms": [
    {
      "name": "High Temperature",
      "description": "Body temperature above normal range",
      "ranges": {
        "mild": "37.5-38.3°C",
        "moderate": "38.4-39.4°C",
        "high": ">39.5°C"
      },
      "associated_symptoms": [],
      "risk_level": "varies by age",
      "notes": ""
    }
  ]
}
```

### 2. Training Conversations (Put files in `training_conversations/`)
Required files:
- `sample_consultations.json` - Real or simulated patient consultations
- `common_questions.json` - Frequently asked questions and answers
- `patient_descriptions.json` - Various ways patients describe symptoms

Format example for `sample_consultations.json`:
```json
{
  "conversations": [
    {
      "id": "conv_001",
      "patient_age": "adult",
      "initial_complaint": "fever with headache",
      "temperature": "38.5°C",
      "dialogue": [
        {
          "role": "patient",
          "message": "I have had a fever since yesterday"
        },
        {
          "role": "assistant",
          "message": "What is your current temperature?"
        }
      ],
      "final_recommendation": "",
      "tags": []
    }
  ]
}
```

### 3. Decision Trees (Put files in `decision_trees/`)
Required files:
- `triage_protocol.json` - Decision tree for initial assessment
- `risk_assessment.json` - Risk evaluation criteria
- `treatment_guidelines.json` - Treatment recommendation protocols

Format example for `triage_protocol.json`:
```json
{
  "decision_points": [
    {
      "id": "initial_assessment",
      "question": "What is the patient's temperature?",
      "options": [
        {
          "condition": "temperature >= 40°C",
          "next_step": "emergency_protocol",
          "recommendation": "Seek immediate medical attention"
        }
      ]
    }
  ]
}
```

## Data Collection Guidelines

1. Medical Accuracy:
   - All data should be verified by medical professionals
   - Include source references where applicable
   - Keep information up-to-date with current medical guidelines

2. Data Format:
   - Use JSON format for structured data
   - UTF-8 encoding
   - Include metadata (source, last updated date, version)

3. Privacy:
   - Remove all personal identifying information
   - Use synthetic data where appropriate
   - Comply with healthcare data privacy regulations

## Validation Process
1. Medical review of all knowledge base content
2. Verification of decision trees by healthcare professionals
3. Testing of conversation flows with sample scenarios

## Updates and Maintenance
- Regular reviews of medical content
- Update guidelines based on new medical research
- Add new conversation patterns as they emerge