# Backend Service

This directory contains the backend service for the myFun Chrome Extension.

## Overview

The backend service is designed to centralize and manage application settings and data storage. The primary functionality includes:

### Settings Management

The backend service will **replace the settings functions** currently handled by the Chrome extension. All application settings will be:

- **Stored in Neo4j database** - Settings are persisted in the graph database for centralized management
- **Accessible via API** - The backend provides APIs for the extension to read and update settings
- **Profile-scoped** - **All data in Neo4j is related to Chrome profiles**, ensuring data isolation between different user profiles
- **Centralized** - All settings are managed in one place, making it easier to maintain and synchronize across multiple devices or instances

This migration from local storage (browser storage) to a centralized Neo4j database will enable:
- Better data management and organization
- Profile-based data isolation and security
- Cross-device synchronization for the same Chrome profile
- Enhanced security and access control per profile
- Historical tracking of settings changes per profile
- Graph-based relationships between settings and other entities within a profile context

### Technology Stack

The backend service is implemented using:

- **FastAPI** - Modern, fast (high-performance) web framework for building APIs with Python
  - Automatic API documentation (OpenAPI/Swagger)
  - Type hints and data validation with Pydantic
  - Async/await support for high performance
  - Easy integration with Neo4j drivers

- **Neo4j** - Graph database for storing all settings and data
  - Native graph queries with Cypher
  - Profile-based data relationships
  - ACID transactions

- **Python** - Programming language for the backend service

The FastAPI framework provides:
- RESTful API endpoints for settings management
- Automatic request/response validation
- Interactive API documentation at `/docs`
- WebSocket support (if needed for real-time updates)
- Easy testing and development

### Settings Categories

The following settings categories will be migrated from the Chrome extension's local storage to Neo4j:

#### 1. Basic Settings (API Configuration)
These settings configure the AI model APIs and core functionality:
- **API Key** (`apiKey`) - Authentication key for the AI service
- **Base URL** (`baseURL`) - API endpoint URL (e.g., `https://api.openai.com/v1`)
- **Organization** (`organization`) - Organization or team identifier
- **Default Model** (`defaultModel`) - Primary GPT model (default: `glm-4-plus`)
- **Reasoning Model** (`reasoningModel`) - Model for reasoning tasks (e.g., `deepseek-r1`)
- **Tools Call Model** (`toolsCallModel`) - Model for tool/function calling (default: `glm-4-plus`)
- **Multimodal Model** (`multimodalModel`) - Model for image/video processing (default: `glm-4v-plus`)
- **Context Length** (`contextLength`) - Number of conversation turns to keep in context (0-20, default: 5)
- **Language** (`language`) - Interface language (`zh` for Chinese, `en` for English)

#### 2. Feature Toggles
Boolean flags that enable/disable various features:
- **Floating Ball** (`enableFloatingBall`) - Enable floating action button (default: `true`)
- **Multimodal** (`enableMultimodal`) - Enable multimodal (image/video) processing (default: `false`)
- **Reflection** (`enableReflection`) - Enable reflection/self-correction capabilities (default: `false`)
- **Chain of Thoughts** (`enableChainOfThoughts`) - Enable step-by-step reasoning (default: `false`)
- **Search** (`enableSearch`) - Enable search functionality (default: `true`)
- **AI Search** (`enableOptionsAppSearch`) - Enable AI-powered search in options app (default: `true`)
- **AI Assistant** (`enableOptionsAppChatbot`) - Enable chatbot in options app (default: `false`)
- **Architect Tools** (`enableOptionsAppArchitect`) - Enable architecture tools (default: `true`)
- **Writing Tools** (`enableWriting`) - Enable writing assistant tools (default: `false`)
- **History Records** (`enableHistoryRecording`) - Enable conversation history recording (default: `false`)

#### 3. BA Copilot Settings
Configuration for Business Analyst Copilot features:
- **Knowledge API** (`baCopilotKnowledgeApi`) - URL for knowledge base API
- **Copilot API** (`baCopilotApi`) - URL for copilot service API
- **Technical Description** (`baCopilotTechDescription`) - Technical description text

#### 4. Prompt Templates
Custom prompt templates that can be edited and managed:
- **Template Name** - Unique identifier for the template
- **Class Name** - Associated class/agent name
- **Template Content** - The prompt template text (supports parameters)
- **Parameters** - List of parameter definitions for template variables
- **Signature** - Template signature/hash for versioning
- **Allow Empty** - Whether the template can be empty

Templates are stored separately and managed through the Prompt Settings interface.

#### 5. System Settings
System-level configuration:
- **Log Level** (`logLevel`) - Logging verbosity level (`debug`, `info`, `warn`, `error`, default: `info`)

### Data Model

**All data in Neo4j is scoped to Chrome profiles.** The Chrome profile serves as the primary identifier and root node for all data relationships.

#### Core Structure

The data model is organized around **Chrome Profile nodes** as the central entity:

- **Chrome Profile nodes** - Primary nodes representing each Chrome profile
  - Properties: `profileId` (unique identifier), `profileName`, `createdAt`, `lastAccessedAt`
  - All other data is connected to these profile nodes

- **Setting nodes** - Individual setting values with properties, connected to their profile
  - Relationship: `(Profile)-[:HAS_SETTING]->(Setting)`
  - Properties: `key`, `value`, `category`, `updatedAt`

- **Category nodes** - Grouping settings by category (Basic, Features, BA Copilot, System)
  - Relationship: `(Setting)-[:BELONGS_TO]->(Category)`

- **History nodes** - Track changes over time with timestamps, linked to profiles
  - Relationship: `(Profile)-[:HAS_HISTORY]->(History)`
  - Properties: `settingKey`, `oldValue`, `newValue`, `timestamp`, `changeType`

- **Template nodes** - Store prompt templates with relationships to agents/classes, scoped to profiles
  - Relationship: `(Profile)-[:HAS_TEMPLATE]->(Template)`
  - Properties: `name`, `class`, `template`, `parameters`, `signature`, `allowEmpty`

#### Chrome Profile Identification

Chrome profiles can be identified using:
- **Profile ID** - Unique identifier from Chrome's `chrome.runtime.id` or profile path
- **Profile Name** - User-friendly name from Chrome profile
- **Profile Path** - File system path to the profile directory

The extension will send the profile identifier with each API request to ensure data is properly scoped.

#### Benefits of Profile-Based Data Model

This graph structure allows for:
- **Profile isolation** - Complete data separation between different Chrome profiles
- **Querying by profile** - Efficiently retrieve all settings/data for a specific profile
- **Querying by category** - Get settings by category within a profile context
- **Tracking changes** - Monitor setting changes and history per profile
- **Cross-device sync** - Synchronize data for the same profile across devices
- **Multi-profile support** - Support multiple users/profiles on the same machine
- **Data relationships** - Establish relationships between settings and other entities within a profile

#### Example Neo4j Queries

```cypher
// Get all settings for a specific Chrome profile
MATCH (p:ChromeProfile {profileId: $profileId})-[:HAS_SETTING]->(s:Setting)
RETURN s

// Get settings by category for a profile
MATCH (p:ChromeProfile {profileId: $profileId})-[:HAS_SETTING]->(s:Setting)-[:BELONGS_TO]->(c:Category {name: 'Basic'})
RETURN s

// Get all templates for a profile
MATCH (p:ChromeProfile {profileId: $profileId})-[:HAS_TEMPLATE]->(t:Template)
RETURN t

// Get setting change history for a profile
MATCH (p:ChromeProfile {profileId: $profileId})-[:HAS_HISTORY]->(h:History)
RETURN h ORDER BY h.timestamp DESC

// Create a new setting for a profile
MATCH (p:ChromeProfile {profileId: $profileId})
CREATE (s:Setting {key: $key, value: $value, category: $category, updatedAt: datetime()})
CREATE (p)-[:HAS_SETTING]->(s)
RETURN s
```

## Neo4j Database

A Neo4j database is configured for data storage using Docker. The database is managed through the `dev.sh` script.

### Connection Details

- **Container Name**: `neo4j-myfun`
- **Database Name**: `myfun`
- **HTTP Port**: `7475` (Browser UI: http://localhost:7475)
- **Bolt Port**: `7688` (Connection string: `bolt://localhost:7688`)
- **Default Username**: `neo4j`
- **Default Password**: `myfun123` (⚠️ Change this in production!)

### Managing the Database

Use the `dev.sh` script to manage the Neo4j container:

#### Start the database:
```bash
./dev.sh start-db
```
This command will check if the container is running, and if not, create and start it.

#### Check database status:
```bash
./dev.sh status-db
```

#### Stop the database:
```bash
./dev.sh stop-db
```

#### View logs:
```bash
./dev.sh logs-db
```

#### Remove the database (and optionally volumes):
```bash
./dev.sh remove-db
```

#### Access Neo4j Browser:
Open http://localhost:7475 in your browser and login with:
- Username: `neo4j`
- Password: `myfun123`

#### Connection String for Applications:
```
bolt://localhost:7688
```

### Security Note

⚠️ **Important**: The default password `myfun123` should be changed before deploying to production. Update the `NEO4J_PASSWORD` variable in `dev.sh` with a strong password.

### Volumes

The following Docker volumes are created for data persistence:
- `neo4j-myfun-data`: Database data files
- `neo4j-myfun-logs`: Log files
- `neo4j-myfun-import`: Import directory for CSV/JSON files
- `neo4j-myfun-plugins`: APOC and other plugins

### Health Check

The container includes a health check that verifies Neo4j is responding. The `start-db` command will wait for Neo4j to be ready before completing.

## API Implementation

The backend service will be implemented using **FastAPI** to provide RESTful APIs for the Chrome extension.

### API Endpoints (Planned)

The following API endpoints will be implemented:

#### Profile Management
- `POST /api/v1/profiles` - Create or get a Chrome profile
- `GET /api/v1/profiles/{profileId}` - Get profile information
- `PUT /api/v1/profiles/{profileId}` - Update profile metadata

#### Settings Management
- `GET /api/v1/profiles/{profileId}/settings` - Get all settings for a profile
- `GET /api/v1/profiles/{profileId}/settings/{category}` - Get settings by category
- `GET /api/v1/profiles/{profileId}/settings/{key}` - Get a specific setting
- `PUT /api/v1/profiles/{profileId}/settings/{key}` - Update a specific setting
- `POST /api/v1/profiles/{profileId}/settings` - Bulk update settings
- `DELETE /api/v1/profiles/{profileId}/settings/{key}` - Delete a setting

#### Template Management
- `GET /api/v1/profiles/{profileId}/templates` - Get all templates for a profile
- `GET /api/v1/profiles/{profileId}/templates/{templateId}` - Get a specific template
- `POST /api/v1/profiles/{profileId}/templates` - Create a new template
- `PUT /api/v1/profiles/{profileId}/templates/{templateId}` - Update a template
- `DELETE /api/v1/profiles/{profileId}/templates/{templateId}` - Delete a template

#### History
- `GET /api/v1/profiles/{profileId}/history` - Get settings change history
- `GET /api/v1/profiles/{profileId}/history/{settingKey}` - Get history for a specific setting

### API Documentation

FastAPI automatically generates interactive API documentation:
- **Swagger UI**: Available at `/docs` when the service is running
- **ReDoc**: Available at `/redoc` when the service is running

### Development

To start developing the FastAPI backend:

1. **Install dependencies** (once implemented):
   ```bash
   pip install fastapi uvicorn neo4j python-dotenv
   ```

2. **Run the development server**:
   ```bash
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

3. **Access the API**:
   - API: http://localhost:8000
   - Documentation: http://localhost:8000/docs

### Project Structure (Planned)

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application entry point
│   ├── models/              # Pydantic models for request/response
│   ├── schemas/             # Database schemas
│   ├── api/                 # API route handlers
│   │   ├── v1/
│   │   │   ├── profiles.py
│   │   │   ├── settings.py
│   │   │   └── templates.py
│   ├── services/            # Business logic
│   │   ├── neo4j_service.py
│   │   └── settings_service.py
│   └── config.py            # Configuration management
├── dev.sh                   # Database management script
├── requirements.txt          # Python dependencies
└── README.md                # This file
```

