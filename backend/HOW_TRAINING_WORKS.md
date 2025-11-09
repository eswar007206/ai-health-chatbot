# How Model Training Works - Using YOUR Data

## Yes! We Train Models on YOUR Data! 🎯

The training script (`train_models.py`) trains ML models using **ALL the data from your 3 folders**:

## 📁 Data Sources Used for Training

### 1. **knowledge_base/** Folder
Used to train the **Disease Classifier**:
- `symptom_disease_dataset.json` → Maps symptoms to diseases
- `fever_dataset.json` → Fever-specific cases
- `fever_symptoms.json` → Fever symptom patterns
- `symptom_severity.json` → Used for **Severity Classifier**
- `symptom_description.json` → Adds context to symptoms
- `medical_medicine_dataset.json` → Medicine information
- `symptom_precaution.json` → Precaution data

### 2. **decision_trees/** Folder
Used to train the **Emergency Classifier**:
- `emergency_markers.json` → What symptoms = emergency
- `risk_assessment.json` → Risk factors and levels
- `triage_protocol.json` → Triage protocols
- `treatment_decision_flow.json` → Treatment paths

### 3. **training_conversations/** Folder
Used to train the **Emergency Classifier**:
- `sample_consultations.json` → Real conversation examples
- `common_questions.json` → Common Q&A patterns
- `patient_descriptions.json` → How patients describe symptoms

## 🤖 What Gets Trained

### Model 1: Disease Classifier
**Trained on:**
- `symptom_disease_dataset.json` - symptom → disease mappings
- `fever_dataset.json` - fever cases with diagnoses
- `fever_symptoms.json` - fever-related conditions

**What it learns:**
- Given symptoms like ["fever", "headache", "cough"] → Predicts disease (e.g., "Flu")

### Model 2: Severity Classifier
**Trained on:**
- `symptom_severity.json` - severity weights for each symptom
- `symptom_description.json` - symptom descriptions for context
- `risk_assessment.json` - risk levels

**What it learns:**
- Given symptoms → Predicts severity level (1-10 scale)

### Model 3: Emergency Classifier
**Trained on:**
- `emergency_markers.json` - emergency symptoms
- `sample_consultations.json` - cases marked as emergency/not emergency
- `triage_protocol.json` - triage priorities
- `risk_assessment.json` - high-risk conditions

**What it learns:**
- Given symptoms → Predicts if it's an emergency (YES/NO)

## 📊 Training Process

```
1. Load ALL JSON files from your 3 folders
   ↓
2. Process data:
   - Convert symptoms to embeddings (vector representations)
   - Extract disease labels
   - Extract severity scores
   - Extract emergency labels
   ↓
3. Train 3 classifiers:
   - Disease Classifier: symptoms → disease
   - Severity Classifier: symptoms → severity (1-10)
   - Emergency Classifier: symptoms → emergency (yes/no)
   ↓
4. Create embeddings:
   - Symptom embeddings (for similarity matching)
   - Disease embeddings (for similarity matching)
   ↓
5. Save everything to backend/models/
```

## 🔄 The Complete Flow

### During Training:
```
Your JSON Data → Processing → ML Models → Saved Models
```

### During Chat (After Training):
```
User Message 
  ↓
Gemini extracts symptoms
  ↓
Trained Models predict:
  - Disease (from your symptom_disease data)
  - Severity (from your symptom_severity data)
  - Emergency (from your emergency_markers data)
  ↓
Knowledge Base provides:
  - Precautions (from your symptom_precaution data)
  - Decision trees (from your decision_trees data)
  - Similar cases (from your training_conversations data)
  ↓
Gemini combines everything → Response
```

## ✅ This IS Training Your Own Model!

When you run:
```bash
python scripts/train_models.py
```

You're doing exactly what you see people do:
- ✅ Loading YOUR training data
- ✅ Processing YOUR data
- ✅ Training models on YOUR data
- ✅ Saving YOUR trained models

The models learn patterns from YOUR data, not generic data!

## 🎯 Why This Matters

1. **Custom to Your Data**: Models learn from YOUR symptom-disease mappings
2. **Domain-Specific**: Trained on fever/medical data, not general data
3. **Improves Over Time**: Add more data → Retrain → Better predictions
4. **Your Own Bot**: The models are YOURS, trained on YOUR data

## 📝 Example

If your `symptom_disease_dataset.json` has:
```json
{
  "symptom_disease_data": [
    {
      "symptoms": ["fever", "headache", "body_ache"],
      "disease": "Flu"
    }
  ]
}
```

The model learns: "When I see fever + headache + body_ache → It's probably Flu"

Then when a user says "I have fever and headache", the model predicts "Flu" based on YOUR data!

## 🚀 Ready to Train?

```bash
cd backend
python scripts/train_models.py
```

This trains YOUR models on YOUR data! 🎉

