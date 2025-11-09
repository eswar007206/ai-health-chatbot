"""
Training Script

This script trains all the models needed for the Fever AI Helper:
1. Disease classifier
2. Severity classifier
3. Emergency classifier
4. Creates embeddings for symptoms and diseases
"""

import sys
from pathlib import Path

# Add backend directory to Python path
backend_dir = Path(__file__).parent.parent
sys.path.append(str(backend_dir))

from app.services.model_trainer import ModelTrainer

def main():
    print("Starting model training...")
    trainer = ModelTrainer()
    trainer.train()
    print("Training completed successfully!")

if __name__ == "__main__":
    main()