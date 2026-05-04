# Todo List Backend

Python Flask backend for the todo list application.

## Setup

### 1. Create Virtual Environment

```bash
cd backend
python3 -m venv venv
```

### 2. Activate Virtual Environment

**On macOS/Linux:**
```bash
source venv/bin/activate
```

**On Windows:**
```bash
venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

## Project Structure

```
backend/
├── app.py                                      # Flask application entry point (task 5)
├── models.py                                   # Data models and serialization
├── database.py                                 # Database connection and schema
├── routes.py                                   # API endpoint definitions (task 4)
├── validation.py                               # Input validation logic
├── requirements.txt                            # Python dependencies
├── .env.example                                # Environment variable template
├── todos.db                                    # SQLite database (generated)
│
├── test_setup.py                               # Setup and initialization tests
├── test_database_crud.py                       # Database CRUD operation tests
├── test_validation.py                          # Input validation unit tests
│
└── Property-Based Tests (Hypothesis):
    ├── test_property_todo_creation.py          # Property 1: Todo creation
    ├── test_property_empty_title_rejection.py  # Property 2: Empty title rejection
    ├── test_property_todo_retrieval.py         # Property 3: Todo retrieval
    ├── test_property_update_persistence.py     # Property 4: Update persistence
    ├── test_property_delete_persistence.py     # Property 5: Delete persistence
    ├── test_property_input_validation_consistency.py  # Property 6: Validation consistency
    ├── test_property_input_sanitization.py     # Property 7: Input sanitization
    ├── test_property_unique_identifiers.py     # Property 9: Unique identifiers
    └── test_property_data_storage_completeness.py  # Property 10: Data storage
```

## Database Schema

The application uses SQLite with the following schema:

```sql
CREATE TABLE todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    completed BOOLEAN NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_completed ON todos(completed);
CREATE INDEX idx_created_at ON todos(created_at DESC);
```

## Running the Application

### Development Server

Start the Flask development server:

```bash
python app.py
```

The API will be available at `http://localhost:5000/api`

The application will:
- Load configuration from `.env` file
- Initialize the SQLite database
- Enable CORS for the frontend (default: http://localhost:5173)
- Register all API routes under `/api` prefix
- Set up error handlers for 404 and 500 errors
- Configure logging based on LOG_LEVEL environment variable

### Health Check

Verify the server is running:

```bash
curl http://localhost:5000/health
```

Expected response:
```json
{"status": "healthy"}
```

### Environment Variables

Configure the application using environment variables in `.env`:

- `DATABASE_PATH`: Path to SQLite database file (default: `todos.db`)
- `SECRET_KEY`: Flask secret key for session management
- `HOST`: Server host address (default: `0.0.0.0`)
- `PORT`: Server port (default: `5000`)
- `DEBUG`: Enable debug mode (default: `False`)
- `FRONTEND_URL`: Frontend origin for CORS (default: `http://localhost:5173`)
- `LOG_LEVEL`: Logging level (default: `INFO`)

### Production Deployment

For production, use a WSGI server like Gunicorn:

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 'app:create_app()'
```

## Testing Strategy

The backend follows a comprehensive testing approach combining multiple testing methodologies:

### Unit Tests
- **test_setup.py**: Validates database initialization and model serialization
- **test_database_crud.py**: Tests CRUD operations with specific examples
- **test_validation.py**: Tests input validation with edge cases

### Property-Based Tests
Property-based tests use Hypothesis to validate universal correctness properties across randomly generated inputs. Each test validates specific requirements from the design document:

| Test File | Property | Requirements |
|-----------|----------|--------------|
| test_property_todo_creation.py | Todo creation returns complete object | 1.1, 1.3, 1.4 |
| test_property_empty_title_rejection.py | Empty title rejection | 1.2, 4.3 |
| test_property_todo_retrieval.py | Todo retrieval completeness | 2.2, 2.3 |
| test_property_update_persistence.py | Update persistence and response | 3.2, 3.3, 4.2, 4.4 |
| test_property_delete_persistence.py | Delete persistence | 5.2, 5.3 |
| test_property_input_validation_consistency.py | Input validation consistency | 7.1, 7.2 |
| test_property_input_sanitization.py | Input sanitization | 7.4 |
| test_property_unique_identifiers.py | Unique identifiers | 8.3 |
| test_property_data_storage_completeness.py | Complete data storage | 8.4 |

### Test Coverage Goals
- Backend: >85% code coverage
- All correctness properties have corresponding property tests
- All edge cases have unit tests

## Running Tests

The backend includes comprehensive test coverage with both unit tests and property-based tests.

### Run All Tests

```bash
# Run all tests with minimal output
pytest -q

# Run all tests with verbose output
pytest -v

# Run with coverage report
pytest --cov=. --cov-report=html --cov-report=term
```

### Run Specific Test Categories

```bash
# Run only unit tests
pytest test_setup.py test_database_crud.py test_validation.py -v

# Run only property-based tests
pytest test_property_*.py -v

# Run specific property test
pytest test_property_empty_title_rejection.py -v
```

### Property-Based Testing

The backend uses [Hypothesis](https://hypothesis.readthedocs.io/) for property-based testing. These tests validate correctness properties across many randomly generated inputs:

- **Property 1**: Todo creation returns complete object
- **Property 2**: Empty title rejection
- **Property 3**: Todo retrieval completeness
- **Property 4**: Update persistence and response
- **Property 5**: Delete persistence
- **Property 6**: Input validation consistency
- **Property 7**: Input sanitization
- **Property 9**: Unique identifiers
- **Property 10**: Complete data storage

Each property test runs 5 iterations by default (configured for faster execution). To run with more iterations:

```bash
# Run with custom iteration count
pytest test_property_empty_title_rejection.py --hypothesis-seed=0 -v
```

### Test Output Management

For automated testing or CI/CD, use quiet mode to prevent timeouts:

```bash
# Minimal output
pytest -q --tb=short

# Stop on first failure
pytest -x -q
```

## API Endpoints

See the main README.md for complete API documentation.
