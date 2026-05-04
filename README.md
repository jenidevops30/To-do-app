# Todo List Full-Stack Application

A modern, full-stack Todo List application featuring a Python Flask backend with SQLite and a Vue.js 3 frontend with TypeScript and Vite. This application provides a complete RESTful API and a responsive user interface for managing tasks.

## Project Overview

The Todo List Application is designed to:

- **Manage Tasks**: Create, read, update, and delete todo items
- **Track Status**: Toggle completion status of tasks
- **Persist Data**: Reliable storage using SQLite with automatic schema initialization
- **Provide REST API**: Complete API documentation and validation
- **Modern UI**: Responsive dashboard built with Vue.js 3 and TypeScript
- **Comprehensive Testing**: Property-based testing for backend and unit/integration testing for frontend
- **User Authentication**: Secure multi-user system with bcrypt password hashing, session management, and CSRF protection
- **Data Isolation**: Each user's todos are isolated and accessible only after authentication
- **Security**: Rate limiting, HTTPS enforcement, secure cookies, and comprehensive security logging

## Architecture

The system follows a three-tier architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Dashboard (Vue.js 3)                 │
│  • Task Management  • Status Filtering  • Responsive Design      │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS/REST API
┌────────────────────────────┴────────────────────────────────────┐
│                    Backend API (Python/Flask)                   │
│  • CRUD Operations  • Input Validation  • Error Handling         │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────────┐
│                      Database Layer                             │
│  • SQLite Storage  • Automatic Initialization  • Indexed Queries  │
└─────────────────────────────────────────────────────────────────┘
```

### Key Components

**Frontend Dashboard (Vue.js 3 + TypeScript)**:
- Built with Vite for fast development
- State management using Vue 3 Composables
- Component-based architecture
- Comprehensive test suite (Vitest)
- Authentication pages (Login, Signup)
- Protected routes with session validation

**Backend API (Python/Flask)**:
- RESTful endpoints for all Todo operations
- SQLite for local data persistence
- Environment-based configuration
- Property-based testing with Hypothesis
- User authentication with bcrypt password hashing
- Session management with 24-hour token expiration
- CSRF protection for state-changing requests
- Rate limiting for brute force protection
- User-scoped data isolation

## User Login Feature

The application includes a complete multi-user authentication system with the following capabilities:

### Authentication & Security

- **User Registration**: Create accounts with username (3-50 chars) and password (8+ chars, letters + numbers)
- **Secure Login**: Authenticate with bcrypt password verification
- **Session Management**: 24-hour session tokens stored in HTTP-only cookies
- **CSRF Protection**: Token-based protection for all state-changing requests
- **Rate Limiting**: Brute force protection (5 attempts/15 min, 10/hour per IP)
- **Password Security**: Bcrypt hashing with cost factor 10+, never stored plaintext
- **Data Isolation**: Each user's todos are completely isolated and accessible only to that user

### User Interface

- **Login Page**: Username/password authentication with generic error messages
- **Signup Page**: Account creation with real-time validation feedback
- **Protected Routes**: Automatic redirect to login for unauthenticated users
- **Session Persistence**: Automatic session restoration on page refresh
- **Logout**: Secure session invalidation with redirect to login

### API Endpoints

See [API Endpoints](#api-endpoints) section for complete authentication endpoint documentation.

### Implementation Details

For detailed specifications, design, and implementation tasks, see:
- **Requirements**: [.kiro/specs/user-login/requirements.md](./.kiro/specs/user-login/requirements.md)
- **Design**: [.kiro/specs/user-login/design.md](./.kiro/specs/user-login/design.md)
- **Tasks**: [.kiro/specs/user-login/tasks.md](./.kiro/specs/user-login/tasks.md)

## Quick Start

### Option 1: Docker (Recommended)

#### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+

#### Setup

```bash
# Clone the repository
git clone <repository-url>
cd todo-list-app

# Create environment file
cp .env.example .env

# Start all services
docker-compose up
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000/api

For detailed Docker instructions, see [DOCKER.md](./DOCKER.md)

### Option 2: Local Development

#### Prerequisites

- Node.js 18+ and npm (for Frontend)
- Python 3.9+ (for Backend)
- Git

#### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env if needed (defaults work out of the box)

# Start the development server
python app.py
```

The backend API will be available at `http://localhost:5000/api`

#### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with backend API URL

# Start the development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Configuration

### Docker Configuration

For Docker-specific configuration and deployment options, see [DOCKER.md](./DOCKER.md).

**Quick Docker Commands**:

```bash
# Start services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Run tests in container
docker-compose exec backend pytest
docker-compose exec frontend npm test
```

### Backend Environment Variables

Create `backend/.env`:

```env
# Database configuration
DATABASE_PATH=todos.db

# Flask secret key
SECRET_KEY=your-secret-key-here

# Server configuration
HOST=0.0.0.0
PORT=5000
DEBUG=False

# CORS configuration
FRONTEND_URL=http://localhost:5173

# Logging
LOG_LEVEL=INFO
```

#### CORS Configuration Details

The backend is configured to accept requests from multiple origins to support different development and deployment scenarios:

**Production**:
- Only the configured `FRONTEND_URL` is allowed

**Development**:
- `http://localhost:3000` - Frontend dev server (default)
- `http://localhost:5173` - Frontend dev server (Vite)
- `http://127.0.0.1:3000` - Frontend dev server (localhost variant)
- `http://127.0.0.1:5173` - Frontend dev server (Vite, localhost variant)
- `http://localhost:5000` - Backend API (for direct API testing)
- `http://127.0.0.1:5000` - Backend API (localhost variant)

All CORS requests include support for credentials (cookies) and the following headers:
- `Content-Type`
- `Authorization`
- `X-CSRF-Token`

Allowed methods: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`

### Frontend Environment Variables

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

## Project Structure

```
to-do-app/
├── backend/                    # Python Flask backend
│   ├── services/              # Business logic services
│   │   ├── auth_service.py    # User authentication & registration
│   │   ├── session_manager.py # Session token management
│   │   ├── csrf_protection.py # CSRF token handling
│   │   └── rate_limiter.py    # Rate limiting for brute force protection
│   ├── middleware/            # Request middleware
│   │   └── decorators.py      # Authentication & authorization decorators
│   ├── utils/                 # Utility functions
│   │   ├── validation.py      # Input validation for todos & auth
│   │   └── security_logger.py # Security event logging
│   ├── tests/                 # Test suite
│   │   ├── test_auth_*.py     # Authentication unit tests
│   │   ├── test_integration.py # Integration tests
│   │   └── test_*_pbt.py      # Property-based tests
│   ├── migrations/            # Database migrations
│   ├── docs/                  # API documentation
│   ├── app.py                 # Flask app factory
│   ├── routes.py              # API endpoints
│   ├── models.py              # Data models
│   ├── database.py            # Database management
│   └── requirements.txt        # Python dependencies
├── frontend/                   # Vue.js frontend
│   ├── src/                   # Source code
│   │   ├── pages/             # Page components (Login, Signup, Todos)
│   │   ├── components/        # Reusable UI components
│   │   ├── services/          # API client
│   │   ├── composables/       # Vue 3 composition API
│   │   ├── types/             # TypeScript types
│   │   └── router/            # Vue Router configuration
│   └── tests/                 # Unit and integration tests
└── README.md                   # This file
```

### Backend Architecture

The backend is organized into modular layers:

**Services Layer** (`backend/services/`):
- `auth_service.py` - User registration and login with bcrypt password hashing
- `session_manager.py` - Session token generation and validation (24-hour expiration)
- `csrf_protection.py` - CSRF token generation and validation per session
- `rate_limiter.py` - IP-based rate limiting (5 attempts/15 min, 10/hour)

**Middleware Layer** (`backend/middleware/`):
- `decorators.py` - Route protection decorators for authentication, CSRF, and ownership verification

**Utils Layer** (`backend/utils/`):
- `validation.py` - Input validation and sanitization for todos and authentication
- `security_logger.py` - Security event logging for authentication and access control

**API Routes** (`backend/routes.py`):
- Authentication endpoints (signup, login, logout, csrf-token, me)
- Todo endpoints with user-scoped filtering and ownership verification

## API Endpoints

All endpoints are prefixed with `/api`:

### Authentication Endpoints

- `POST /api/auth/signup` - Create new user account
  - Request: `{ username, password, csrfToken }`
  - Response: `{ success, message }` (201 Created)
  - Validates username (3-50 chars) and password (8+ chars, letters + numbers)
  - Returns 409 Conflict if username already taken
  - Rate limited: 10 attempts per hour per IP

- `POST /api/auth/login` - Authenticate user and create session
  - Request: `{ username, password, csrfToken }`
  - Response: `{ success, csrfToken }` (200 OK)
  - Sets HTTP-only session cookie (24-hour expiration)
  - Returns 401 Unauthorized for invalid credentials
  - Rate limited: 5 attempts per 15 minutes, 10 per hour per IP

- `POST /api/auth/logout` - Invalidate session and logout
  - Request: `{ csrfToken }`
  - Response: `{ success, message }` (200 OK)
  - Clears session cookie
  - Returns 401 Unauthorized if not authenticated

- `GET /api/auth/csrf-token` - Get CSRF token for forms
  - Response: `{ csrfToken }` (200 OK)
  - Provides CSRF token for unauthenticated forms (signup, login)

- `GET /api/auth/me` - Get current authenticated user
  - Response: `{ user: { id, username } }` (200 OK)
  - Returns 401 Unauthorized if not authenticated

### Todo Endpoints (User-Scoped)

All todo endpoints require valid session token and filter by authenticated user:

- `GET /api/todos` - Get all todos for authenticated user
  - Response: Array of todo objects (200 OK)
  - Returns 401 Unauthorized if not authenticated

- `POST /api/todos` - Create new todo for authenticated user
  - Request: `{ title, description, completed, csrfToken }`
  - Response: Created todo object (201 Created)
  - Requires CSRF token validation
  - Returns 401 Unauthorized if not authenticated

- `GET /api/todos/:id` - Get specific todo (ownership verified)
  - Response: Todo object (200 OK)
  - Returns 403 Forbidden if user doesn't own todo
  - Returns 401 Unauthorized if not authenticated

- `PUT /api/todos/:id` - Update todo (ownership verified)
  - Request: `{ title, description, completed, csrfToken }`
  - Response: Updated todo object (200 OK)
  - Requires CSRF token validation
  - Returns 403 Forbidden if user doesn't own todo
  - Returns 401 Unauthorized if not authenticated

- `DELETE /api/todos/:id` - Delete todo (ownership verified)
  - Request: `{ csrfToken }`
  - Response: Empty (204 No Content)
  - Requires CSRF token validation
  - Returns 403 Forbidden if user doesn't own todo
  - Returns 401 Unauthorized if not authenticated

- `GET /health` - Service health check
  - Response: `{ status: "ok" }` (200 OK)

## Testing

The project includes comprehensive testing across multiple categories: unit tests, integration tests, and property-based tests. For detailed testing instructions, see [TEST_GUIDE.md](./TEST_GUIDE.md).

### Test Overview

**Total Tests**: 150+
- **Unit Tests**: 80+ tests (~5 seconds)
- **Integration Tests**: 17 tests (~10 seconds)
- **Property-Based Tests**: 31 tests (~30 seconds)
- **Overall Coverage**: 90%+

### Backend Tests

The backend includes comprehensive unit tests, integration tests, and property-based tests for all authentication, session management, CSRF protection, rate limiting, and data isolation features.

#### Quick Start

```bash
cd backend
source .venv/bin/activate

# Run all tests
pytest tests/

# Run with verbose output
pytest tests/ -v

# Run with coverage report
pytest tests/ --cov=. --cov-report=html
```

#### Test Categories

**Unit Tests** (Fast - ~5 seconds):
```bash
cd backend
pytest tests/test_auth_unit.py
pytest tests/test_session_manager.py
pytest tests/test_csrf_protection.py
pytest tests/test_rate_limiter.py
pytest tests/test_todo_access_control.py
pytest tests/test_migration_service.py
```

**Integration Tests** (Medium - ~10 seconds):
```bash
cd backend
pytest tests/test_integration.py
```

**Property-Based Tests** (Slower - ~30 seconds):
```bash
cd backend
pytest tests/test_auth_properties_pbt.py
pytest tests/test_rate_limit_properties_pbt.py
pytest tests/test_migration_properties_pbt.py
pytest tests/test_todo_access_control_pbt.py
```

#### Test Files

| File | Purpose | Tests |
|------|---------|-------|
| `test_auth_unit.py` | Authentication service | 20+ |
| `test_session_manager.py` | Session management | 15+ |
| `test_csrf_protection.py` | CSRF protection | 12+ |
| `test_rate_limiter.py` | Rate limiting | 10+ |
| `test_todo_access_control.py` | Data isolation | 15+ |
| `test_migration_service.py` | Database migration | 8+ |
| `test_integration.py` | End-to-end flows | 17 |
| `test_auth_properties_pbt.py` | Auth properties | 21 |
| `test_rate_limit_properties_pbt.py` | Rate limit properties | 3 |
| `test_migration_properties_pbt.py` | Migration properties | 1 |
| `test_todo_access_control_pbt.py` | Access control properties | 6 |

#### Test Coverage

- **Authentication**: 95%+
- **Session Management**: 95%+
- **CSRF Protection**: 95%+
- **Rate Limiting**: 95%+
- **Todo Access Control**: 95%+
- **Overall**: 90%+

#### Common Test Commands

```bash
cd backend

# Run specific test file
pytest tests/test_auth_unit.py -v

# Run specific test function
pytest tests/test_auth_unit.py::test_valid_account_creation -v

# Run tests matching pattern
pytest tests/ -k "auth" -v

# Run tests and stop on first failure
pytest tests/ -x

# Run tests with timing information
pytest tests/ --durations=10

# Run only property-based tests
pytest tests/ -k "pbt" -v
```

For comprehensive testing documentation, see [TEST_GUIDE.md](./TEST_GUIDE.md).

### Frontend Tests
```bash
cd frontend
npm test
```
