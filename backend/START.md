# Quick Start Guide

## Prerequisites

- Python 3.8 or higher
- Docker (for Neo4j)
- Node.js and npm (for extension development)

## Setup

### 1. Start Neo4j Database

```bash
cd backend
./dev.sh start-db
```

This will start the Neo4j container on ports 7475 (HTTP) and 7688 (Bolt).

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` if needed (defaults should work for local development).

### 3. Install Python Dependencies

```bash
# Create virtual environment (if not exists)
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 4. Run the Backend Server

```bash
# Using the dev script
./dev.sh start

# Or manually
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at:
- API: http://localhost:8000
- Documentation: http://localhost:8000/docs
- Health Check: http://localhost:8000/health

### 5. Configure Extension

The extension is configured to use the backend API by default. The backend URL can be configured via environment variable `BACKEND_API_URL` (defaults to `http://localhost:8000/api/v1`).

To disable backend storage and use local storage only, set `USE_BACKEND_STORAGE=false` in the extension's build environment.

## Testing

### Test the API

```bash
# Health check
curl http://localhost:8000/health

# Create/get profile
curl -X POST http://localhost:8000/api/v1/profiles \
  -H "Content-Type: application/json" \
  -d '{"profile_id": "test_profile", "profile_name": "Test Profile"}'

# Get settings
curl http://localhost:8000/api/v1/profiles/test_profile/settings

# Update a setting
curl -X PUT http://localhost:8000/api/v1/profiles/test_profile/settings/apiKey \
  -H "Content-Type: application/json" \
  -d '{"key": "apiKey", "value": "test-key", "category": "Basic"}'
```

### Access Neo4j Browser

Open http://localhost:7475 and login with:
- Username: `neo4j`
- Password: `myfun123`

## Development

The backend uses FastAPI with automatic reload enabled. Changes to Python files will automatically restart the server.

### Project Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI application
│   ├── config.py            # Configuration
│   ├── api/
│   │   └── v1/
│   │       ├── profiles.py  # Profile endpoints
│   │       └── settings.py  # Settings endpoints
│   ├── models/
│   │   └── schemas.py       # Pydantic models
│   └── services/
│       └── neo4j_service.py # Neo4j operations
├── dev.sh                   # Development script (database & server management)
└── requirements.txt         # Python dependencies
```

## Troubleshooting

### Neo4j Connection Issues

1. Check if Neo4j is running: `./dev.sh status-db`
2. Verify connection: `curl http://localhost:7475`
3. Check logs: `./dev.sh logs-db`

### Backend API Issues

1. Check if backend is running: `curl http://localhost:8000/health`
2. Check Neo4j connection in health endpoint response
3. Review server logs in terminal

### Extension Connection Issues

1. Verify backend is running and accessible
2. Check browser console for API errors
3. Verify CORS is configured correctly (currently allows all origins)

