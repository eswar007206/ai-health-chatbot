import os
from typing import List, Optional

try:
    import google.generativeai as genai
    HAS_GEMINI = True
except ImportError:
    print("Warning: google.generativeai not found. Some AI features will be limited.")
    HAS_GEMINI = False

class AIService:
    """Core service that orchestrates all AI-powered experiences."""

    DEFAULT_TEXT_MODELS = [
        "gemini-pro",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-2.0-flash-exp",
    ]

    DEFAULT_VISION_MODELS = [
        "gemini-pro-vision",
        "gemini-1.0-pro-vision-001",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-1.5-flash-latest",
        "gemini-2.0-flash-exp",
    ]

    def __init__(self):
        self.model = None
        self.vision_model = None  # For image analysis
        self.available_models: List[str] = []
        
        # Try to configure Gemini if available
        if HAS_GEMINI:
            api_key = os.getenv('GEMINI_API_KEY')
            if api_key:
                genai.configure(api_key=api_key)
                self.available_models = self._list_available_models()
                self.model = self._initialize_gemini_model()
                self.vision_model = self._initialize_vision_model()
            else:
                print("Warning: GEMINI_API_KEY not set. AI features will be limited.")
    
    def _initialize_gemini_model(self):
        """Initialize the default text model with sensible fallbacks."""
        preferred = os.getenv("GEMINI_TEXT_MODEL")
        candidates = self._prepare_model_candidates(preferred, self.DEFAULT_TEXT_MODELS)
        model = self._try_initialize_model("text", candidates)
        if not model:
            print("❌ Could not initialize any Gemini text model")
        return model
    
    def _initialize_vision_model(self):
        """Initialize a vision-capable Gemini model for image analysis."""
        preferred = os.getenv("GEMINI_VISION_MODEL")
        candidates = self._prepare_model_candidates(preferred, self.DEFAULT_VISION_MODELS)
        model = self._try_initialize_model("vision", candidates)
        if model:
            return model
        print("⚠️  Could not initialize any dedicated vision model")
        return None

    def _prepare_model_candidates(self, configured: Optional[str], defaults: List[str]) -> List[str]:
        """Build a de-duplicated list of model names to attempt."""
        candidates: List[str] = []
        seen = set()
        for name in [configured, *defaults]:
            if not name:
                continue
            normalized = str(name).strip()
            if normalized.startswith("models/"):
                normalized = normalized.split("/", 1)[1]
            if normalized and normalized not in seen:
                seen.add(normalized)
                candidates.append(normalized)
        return candidates

    def _is_model_available(self, model_name: str) -> bool:
        """Check whether the current API key exposes the requested model."""
        if not self.available_models:
            return True  # list_models failed; optimistically try everything
        normalized = model_name.split("/")[-1]
        return any(entry.endswith(normalized) for entry in self.available_models)

    def _try_initialize_model(self, purpose: str, candidates: List[str]):
        """Try instantiating the first candidate that is available."""
        for model_name in candidates:
            if not self._is_model_available(model_name):
                print(f"⏭️  Skipping {purpose} model {model_name} (not enabled for this API key)")
                continue
            try:
                print(f"🔄 Trying {purpose} model: {model_name}")
                model = genai.GenerativeModel(model_name)
                print(f"✅ Successfully initialized {purpose} model: {model_name}")
                return model
            except Exception as e:
                print(f"✗ Failed to initialize {purpose} model {model_name}: {str(e)[:200]}")
        return None

    def _list_available_models(self) -> List[str]:
        """Fetch the list of models the current API key can access."""
        try:
            models = list(genai.list_models())
            available = [
                model.name for model in models
                if "generateContent" in getattr(model, "supported_generation_methods", [])
                or "generate_content" in getattr(model, "supported_generation_methods", [])
            ]
            if available:
                preview = ", ".join(entry.split("/")[-1] for entry in available[:5])
                print(f"ℹ️ Gemini models enabled for this key: {preview}{'...' if len(available) > 5 else ''}")
            else:
                print("⚠️ list_models returned no entries with generateContent")
            return available
        except Exception as e:
            print(f"⚠️  Could not list models from API: {e}")
            return []
