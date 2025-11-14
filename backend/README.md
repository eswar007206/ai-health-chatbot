# Fever Helpline - Backend (Python)

## Overview
This is the Python backend for the Fever Helpline application. It will handle:
- AI model integration
- Symptom analysis engine
- Database operations
- API endpoints for the frontend
- Health data processing

## Tech Stack (Planned)
- **Framework**: FastAPI / Flask
- **Database**: PostgreSQL with SQLAlchemy
- **AI Integration**: OpenAI API / Custom ML models
- **Authentication**: JWT tokens
- **Deployment**: Docker + Cloud provider

## Setup Instructions

### Prerequisites
- Python 3.9+
- pip or poetry for package management
- PostgreSQL database

### Installation
```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies (to be added)
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

## Project Structure (To Be Implemented)
```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application entry
│   ├── api/
│   │   ├── __init__.py
│   │   ├── chat.py          # Chat endpoints
│   │   ├── health.py        # Health data endpoints
│   │   └── auth.py          # Authentication endpoints
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py          # User model
│   │   ├── conversation.py  # Conversation model
│   │   └── health_data.py   # Health data model
│   ├── services/
│   │   ├── __init__.py
│   │   ├── ai_service.py    # AI/LLM integration
│   │   ├── symptom_analyzer.py  # Symptom analysis logic
│   │   └── recommendation_engine.py
│   ├── database/
│   │   ├── __init__.py
│   │   └── connection.py    # Database configuration
│   └── utils/
│       ├── __init__.py
│       └── helpers.py
├── tests/
│   └── __init__.py
├── requirements.txt
├── .env.example
├── .gitignore
└── README.md
```

## API Endpoints (Planned)

### Chat
- `POST /api/chat/message` - Send a message and get AI response
- `GET /api/chat/history/:conversation_id` - Get conversation history
- `POST /api/chat/new` - Start new conversation

### Health Data
- `POST /api/health/vitals` - Record vital signs
- `GET /api/health/vitals/:user_id` - Get health history
- `POST /api/health/analyze` - Analyze symptoms

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

## Environment Variables
```
DATABASE_URL=postgresql://user:password@localhost:5432/fever_helpline
OPENAI_API_KEY=your_openai_api_key
JWT_SECRET=your_secret
ENVIRONMENT=development
GEMINI_API_KEY=your_gemini_key
# Optional overrides (fall back to safe defaults if omitted):
GEMINI_TEXT_MODEL=gemini-pro
GEMINI_VISION_MODEL=gemini-pro-vision
GEMINI_SPEECH_MODEL=gemini-pro-vision
```

## Development Status
🚧 **This backend is currently in planning phase.**

Next steps:
1. Set up FastAPI project structure
2. Configure database models
3. Implement AI service integration
4. Create API endpoints
5. Add authentication
6. Write tests

## Contributing
This is part of the Fever Helpline project. Follow the main project guidelines for contributions.
