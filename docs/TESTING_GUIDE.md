# Testing Guide

This document provides comprehensive information about the testing strategy and test execution for the Todo List application with User Login feature.

## Overview

The application uses multiple testing approaches to ensure correctness and reliability:

- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test interactions between components
- **Property-Based Tests**: Verify correctness properties across a wide range of inputs
- **End-to-End Tests**: Test complete user workflows

## Backend Testing

### Authentication Unit Tests

The authentication service includes 70 comprehensive unit tests covering password hashing, verification, validation, user registration, and login functionality.

#### Test Structure

```
backend/test_auth_unit.py
├── TestPasswordHashing (12 tests)
│   ├── Hash generation and uniqueness
│   ├── Special characters and unicode support
│   ├── Length validation
│   └── Error handling
├── TestPasswordVerification (10 tests)
│   ├── Correct/incorrect password verification
│   ├── Case sensitivity
│   ├── Special characters and unicode
│   └── Invalid hash handling
├── TestUsernameValidation (15 tests)
│   ├── Valid username formats
│   ├── Length constraints (3-50 characters)
│   ├── Character restrictions
│   └── Type validation
├── TestPasswordValidation (12 tests)
│   ├── Length constraints (8-128 characters)
│   ├── Complexity requirements (letters + numbers)
│   ├── Unicode support
│   └── Type validation
├── TestUserRegistration (8 tests)
│   ├── Successful signup
│   ├── Duplicate username prevention
│   ├── Validation enforcement
│   └── Password hashing verification
├── TestUserLogin (9 tests)
│   ├── Successful login
│   ├── Wrong password rejection
│   ├── Non-existent user rejection
│   ├── Generic error messages
│   └── Case sensitivity
└── TestAuthenticationIntegration (4 tests)
    ├── Complete signup/login flow
    ├── Password hash consistency
    └── Multiple user independence
```

#### Running Authentication Tests

**Run all authentication tests**:
```bash
cd backend
source .venv/bin/activate
pytest test_auth_unit.py -v
```

**Run specific test class**:
```bash
pytest test_auth_unit.py::TestPasswordHashing -v
pytest test_auth_unit.py::TestUserLogin -v
```

**Run specific test**:
```bash
pytest test_auth_unit.py::TestPasswordHashing::test_hash_password_not_equal_to_plaintext -v
```

**Run with coverage report**:
```bash
pytest test_auth_unit.py --cov=auth_service --cov-report=html
```

**Run with verbose output and print statements**:
```bash
pytest test_auth_unit.py -v -s
```

#### Test Requirements Mapping

The authentication unit tests validate the following requirements:

| Requirement | Tests | Coverage |
|-------------|-------|----------|
| 1.1 - User Account Creation | TestUserRegistration::test_signup_success | ✓ |
| 1.2 - Duplicate Username Rejection | TestUserRegistration::test_signup_duplicate_username | ✓ |
| 1.3 - Password Length Validation | TestPasswordValidation::test_validate_password_too_short | ✓ |
| 1.4 - Password Complexity Validation | TestPasswordValidation::test_validate_password_no_letters, test_validate_password_no_numbers | ✓ |
| 1.5 - Username Minimum Length | TestUsernameValidation::test_validate_username_valid_minimum_length | ✓ |
| 1.6 - Username Maximum Length | TestUsernameValidation::test_validate_username_valid_maximum_length | ✓ |
| 1.7 - Password Hashing with Bcrypt | TestPasswordHashing::test_hash_password_not_equal_to_plaintext | ✓ |
| 1.8 - No Plaintext Passwords | TestUserRegistration::test_signup_password_is_hashed | ✓ |
| 2.1 - Successful Login Issues Token | TestUserLogin::test_login_success | ✓ |
| 2.2 - Failed Login with Wrong Password | TestUserLogin::test_login_wrong_password | ✓ |
| 2.3 - Failed Login with Non-Existent User | TestUserLogin::test_login_nonexistent_user | ✓ |
| 2.4 - Generic Error Messages | TestUserLogin::test_login_generic_error_message_* | ✓ |
| 9.1 - Password Hashing | TestPasswordHashing::test_hash_password_not_equal_to_plaintext | ✓ |
| 9.5 - Password Verification with Bcrypt | TestPasswordVerification::test_verify_password_correct_password | ✓ |

### Running All Backend Tests

```bash
cd backend
source .venv/bin/activate

# Run all tests
pytest -v

# Run with coverage
pytest --cov=. --cov-report=html

# Run specific test file
pytest test_auth_unit.py -v

# Run tests matching pattern
pytest -k "password" -v
```

### Test Database

Authentication tests use temporary SQLite databases created during test execution:

```python
@pytest.fixture
def db():
    """Create a temporary test database."""
    fd, db_path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    
    database = TodoDatabase(db_path)
    yield database
    
    # Cleanup
    try:
        os.unlink(db_path)
    except Exception:
        pass
```

Each test gets a fresh, isolated database that is automatically cleaned up after the test completes.

## Frontend Testing

### Unit Tests

Frontend components are tested using Vitest:

```bash
cd frontend
npm test
```

### Integration Tests

Integration tests verify component interactions and API communication:

```bash
cd frontend
npm run test:integration
```

## Property-Based Testing

Property-based tests verify that correctness properties hold across a wide range of generated inputs. These tests are implemented using Hypothesis (Python) and fast-check (JavaScript).

### Backend Property-Based Tests

Property-based tests for the authentication service will verify:

1. **Valid Account Creation** - Any valid username and password can create an account
2. **Duplicate Username Rejection** - Duplicate usernames are always rejected
3. **Password Length Validation** - Passwords shorter than 8 characters are rejected
4. **Password Complexity Validation** - Passwords without letters or numbers are rejected
5. **Username Length Validation** - Usernames outside 3-50 character range are rejected
6. **Password Hashing** - Hashed passwords never equal plaintext
7. **Successful Login Issues Token** - Valid credentials always issue a token
8. **Failed Login with Wrong Password** - Wrong passwords always fail
9. **Failed Login with Non-Existent User** - Non-existent users always fail
10. **Generic Error Messages** - Same error for invalid username and password

Running property-based tests:

```bash
cd backend
source .venv/bin/activate

# Run property-based tests (when implemented)
pytest test_auth_properties.py -v

# Run with specific number of examples
pytest test_auth_properties.py -v --hypothesis-seed=0
```

## Docker Testing

### Run Tests in Docker

```bash
# Run backend tests
docker-compose exec backend pytest -v

# Run backend tests with coverage
docker-compose exec backend pytest --cov=. --cov-report=html

# Run frontend tests
docker-compose exec frontend npm test

# Run specific test file
docker-compose exec backend pytest test_auth_unit.py -v
```

### View Test Results

```bash
# View backend coverage report
docker-compose exec backend cat htmlcov/index.html

# View test logs
docker-compose logs backend
docker-compose logs frontend
```

## Continuous Integration

Tests are automatically run on:
- Every commit (pre-commit hooks)
- Every pull request
- Before deployment

### CI Configuration

See `.github/workflows/` for CI/CD pipeline configuration.

## Test Execution Checklist

Before deploying to production, ensure:

- [ ] All unit tests pass: `pytest -v`
- [ ] All integration tests pass: `pytest test_integration.py -v`
- [ ] All property-based tests pass: `pytest test_*_properties.py -v`
- [ ] Code coverage is above 80%: `pytest --cov=. --cov-report=term-missing`
- [ ] Frontend tests pass: `npm test`
- [ ] No security warnings: `npm audit`, `pip audit`
- [ ] All linting passes: `flake8`, `eslint`

## Troubleshooting

### Common Issues

**Tests fail with "database is locked"**:
- Ensure no other processes are using the test database
- Clear `.pytest_cache/` directory
- Run tests sequentially: `pytest -n0`

**Import errors in tests**:
- Ensure virtual environment is activated: `source .venv/bin/activate`
- Reinstall dependencies: `pip install -r requirements.txt`

**Frontend tests timeout**:
- Increase timeout: `npm test -- --testTimeout=10000`
- Check for infinite loops in components

**Coverage report not generated**:
- Install coverage: `pip install coverage`
- Run with coverage flag: `pytest --cov=.`

## Best Practices

1. **Run tests frequently** - Run tests after every change
2. **Write tests first** - Use TDD approach for new features
3. **Keep tests isolated** - Each test should be independent
4. **Use descriptive names** - Test names should describe what they test
5. **Test edge cases** - Include boundary and error cases
6. **Maintain test data** - Keep test fixtures up-to-date
7. **Review coverage** - Aim for >80% code coverage
8. **Document tests** - Add docstrings explaining test purpose

## References

- [Pytest Documentation](https://docs.pytest.org/)
- [Hypothesis Documentation](https://hypothesis.readthedocs.io/)
- [Vitest Documentation](https://vitest.dev/)
- [Testing Best Practices](https://testingjavascript.com/)
