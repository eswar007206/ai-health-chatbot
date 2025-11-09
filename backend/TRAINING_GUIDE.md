# Training Guide for Fever AI Helper

## Overview
This guide will help you train your own ML models using your medical data. The trained models will work alongside Gemini AI and your knowledge base to provide better predictions.

## Prerequisites
1. Python 3.9+ installed
2. All dependencies installed: `pip install -r requirements.txt`
3. Your data files in `backend/data/` folder:
   - `knowledge_base/` - All JSON files with medical data
   - `decision_trees/` - Decision tree protocols
   - `training_conversations/` - Sample conversations

## Step 1: Install Dependencies
Make sure you have all required packages:
```bash
cd backend
pip install -r requirements.txt
```

Key packages needed:
- `sentence-transformers` - For creating embeddings
- `scikit-learn` - For training classifiers
- `joblib` - For saving models
- `numpy` - For numerical operations

## Step 2: Train the Models
Run the training script:
```bash
# From the backend directory
python scripts/train_models.py
```

This will:
1. Load all your JSON data files
2. Process and prepare training data
3. Train three classifiers:
   - Disease Classifier (predicts diseases from symptoms)
   - Severity Classifier (predicts severity level)
   - Emergency Classifier (predicts if emergency)
4. Create embeddings for symptoms and diseases
5. Save everything to `backend/models/` folder

## Step 3: Verify Training
After training, check that these files were created in `backend/models/`:
- `disease_classifier.joblib`
- `severity_classifier.joblib`
- `emergency_classifier.joblib`
- `symptom_embeddings.npy`
- `disease_embeddings.npy`

## Step 4: Start Your Application
Once models are trained, start your backend:
```bash
python -m uvicorn app.main:app --reload
```

The ChatService will automatically:
- Load the trained models
- Use them alongside your knowledge base
- Combine predictions with Gemini AI for better responses

## How It Works
Your bot now uses a **hybrid approach**:

1. **Trained ML Models** 🤖
   - Predict diseases, severity, and emergencies from symptoms
   - Trained on YOUR data

2. **Knowledge Base** 📚
   - Rule-based analysis from JSON files
   - Symptom-disease mappings
   - Precautions and recommendations
   - Decision trees

3. **Gemini AI** 🧠
   - Natural language understanding
   - Handles weird/ambiguous inputs
   - Generates human-like responses
   - Combines all information intelligently

## Retraining
If you update your data files, retrain the models:
```bash
python scripts/train_models.py
```

The new models will be saved and automatically loaded on next startup.

## Troubleshooting

### "Module not found" errors
Install missing packages:
```bash
pip install sentence-transformers scikit-learn joblib numpy
```

### Training takes too long
- This is normal for the first time (downloading embedding model)
- Subsequent trainings are faster

### Models not loading
- Check that files exist in `backend/models/`
- Check file permissions
- Re-run training script

### Low prediction accuracy
- Make sure your training data is comprehensive
- Check that JSON files are properly formatted
- More training data = better predictions

## Next Steps
1. Train your models: `python scripts/train_models.py`
2. Start backend: `python -m uvicorn app.main:app --reload`
3. Start frontend: `npm run dev`
4. Test your bot with various inputs!

