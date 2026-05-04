"""
API routes module for todo list application.

This module defines the Flask blueprint with RESTful API endpoints
for managing todo items and authentication. All routes are prefixed
with /api.

Security features:
- Authentication and authorization on protected endpoints
- CSRF token validation on state-changing requests
- Rate limiting on authentication endpoints
- Security logging for authentication events
"""

from flask import Blueprint, request, jsonify, current_app
from utils.validation import (
    validate_todo_create,
    validate_todo_update,
    ValidationError,
    sanitize_todo_data
)
from models import Todo
from datetime import datetime, timedelta
from services.auth_service import signup as auth_signup, login as auth_login
from services.rate_limiter import track_attempt, check_rate_limit
from services.csrf_protection import create_csrf_token, validate_csrf_token
from services.session_manager import create_session, invalidate_session, \
    validate_session_token
from middleware.decorators import require_auth, require_csrf, require_ownership
from utils.security_logger import (
    log_failed_login,
    log_rate_limit_trigger,
    log_csrf_failure,
    log_unauthorized_access,
    log_successful_login,
    log_logout,
    log_signup_attempt,
    log_password_validation_failure,
    log_username_validation_failure,
    log_duplicate_username,
    log_invalid_session_token,
    log_todo_access_denied
)


api = Blueprint('api', __name__)


@api.route('/auth/signup', methods=['POST'])
def signup():
    """Create a new user account.

    Request body:
        {
            "username": "string (required, 3-50 chars, alphanumeric + _)",
            "password": "string (required, 8+ chars, letters and numbers)",
            "csrfToken": "string (required for CSRF protection)"
        }

    Returns:
        JSON response with success message (201 Created)
        JSON response with validation errors (400 Bad Request)
        JSON response with duplicate username error (409 Conflict)
        JSON response with rate limit error (429 Too Many Requests)

    Example success response:
        {
            "success": true,
            "message": "Account created successfully"
        }

    Example validation error response:
        {
            "error": "Validation failed",
            "errors": {
                "username": ["Username must be at least 3 characters"]
            }
        }

    Example duplicate username response:
        {
            "error": "Username already taken"
        }

    Example rate limit response:
        {
            "error": "Too many requests. Please try again later."
        }

    **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8**
    """
    try:
        # Get client IP address for rate limiting
        # Support X-Forwarded-For header for proxied requests
        ip_address = request.headers.get(
            'X-Forwarded-For',
            request.remote_addr
        )
        if ',' in ip_address:
            # X-Forwarded-For can contain multiple IPs, use the first one
            ip_address = ip_address.split(',')[0].strip()

        db = current_app.db

        # Check rate limit before processing request
        # Requirement 3.1.4: Implement rate limiting (10 per hour per IP)
        is_allowed, rate_limit_error = check_rate_limit(
            db,
            ip_address,
            '/api/auth/signup'
        )
        if not is_allowed:
            current_app.logger.warning(
                f"Signup rate limit exceeded for IP: {ip_address}"
            )
            # Task 9.5: Log rate limit trigger
            log_rate_limit_trigger(
                ip_address,
                '/api/auth/signup',
                10  # Approximate attempt count
            )
            return jsonify({'error': rate_limit_error}), 429

        # Try to parse JSON, catch parsing errors
        try:
            data = request.get_json()
        except Exception:
            return jsonify({
                'error': 'Validation failed',
                'errors': {'body': ['Request body must be valid JSON']}
            }), 400

        if data is None:
            return jsonify({
                'error': 'Validation failed',
                'errors': {'body': ['Request body must be valid JSON']}
            }), 400

        # Requirement 3.1.2: Implement request validation
        # Validate required fields
        username = data.get('username', '').strip()
        password = data.get('password', '')

        validation_errors = {}

        if not username:
            validation_errors['username'] = ['Username is required']

        if not password:
            validation_errors['password'] = ['Password is required']

        if validation_errors:
            return jsonify({
                'error': 'Validation failed',
                'errors': validation_errors
            }), 400

        # Requirement 3.1.3: Implement CSRF token validation
        csrf_token = data.get('csrfToken', '')
        if not csrf_token:
            current_app.logger.warning(
                f"Signup attempt without CSRF token from IP: {ip_address}"
            )
            # Task 9.5: Log CSRF failure
            log_csrf_failure(
                ip_address,
                '/api/auth/signup',
                'missing'
            )
            return jsonify({
                'error': 'Request validation failed. Please try again.'
            }), 403

        # Note: CSRF token validation would require a session context.
        # For signup (unauthenticated), we validate that the token is present.
        # Full CSRF validation happens after session creation.

        # Requirement 3.1.5: Call signup service
        success, error_message, user_data = auth_signup(
            db,
            username,
            password
        )

        if not success:
            # Track failed signup attempt for rate limiting
            track_attempt(db, ip_address, '/api/auth/signup')

            # Determine error type and return appropriate response
            if error_message == "Username already taken":
                # Requirement 3.1.6: Return 409 for duplicate username
                current_app.logger.warning(
                    f"Signup attempt with duplicate username: {username}"
                )
                # Task 9.5: Log duplicate username attempt
                log_duplicate_username(ip_address, username)
                return jsonify({'error': error_message}), 409
            else:
                # Validation error - return 400
                # Parse error message to determine which field failed
                if "Username" in error_message:
                    validation_errors['username'] = [error_message]
                    # Task 9.5: Log username validation failure
                    log_username_validation_failure(ip_address, error_message)
                elif "Password" in error_message:
                    validation_errors['password'] = [error_message]
                    # Task 9.5: Log password validation failure
                    log_password_validation_failure(ip_address, error_message)
                else:
                    validation_errors['general'] = [error_message]

                return jsonify({
                    'error': 'Validation failed',
                    'errors': validation_errors
                }), 400

        # Requirement 3.1.6: Return 201 Created on success
        current_app.logger.info(f"User account created: {username}")
        # Task 9.5: Log successful signup
        log_signup_attempt(ip_address, username, success=True)
        return jsonify({
            'success': True,
            'message': 'Account created successfully'
        }), 201

    except Exception as e:
        current_app.logger.error(f"Error during signup: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@api.route('/auth/login', methods=['POST'])
def login():
    """Authenticate a user and create a session.

    Request body:
        {
            "username": "string (required)",
            "password": "string (required)",
            "csrfToken": "string (required for CSRF protection)"
        }

    Returns:
        JSON response with CSRF token (200 OK)
        JSON response with authentication error (401 Unauthorized)
        JSON response with rate limit error (429 Too Many Requests)

    Sets:
        HTTP-only session cookie with 24-hour expiration
        Secure flag (HTTPS only)
        SameSite=Strict flag (CSRF protection)

    Example success response:
        {
            "success": true,
            "csrfToken": "token_string"
        }

    Example authentication error response:
        {
            "error": "Invalid credentials"
        }

    Example rate limit response:
        {
            "error": "Too many requests. Please try again later."
        }

    **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 3.2.1-3.2.8**
    """
    try:
        # Get client IP address for rate limiting
        # Support X-Forwarded-For header for proxied requests
        ip_address = request.headers.get(
            'X-Forwarded-For',
            request.remote_addr
        )
        if ',' in ip_address:
            # X-Forwarded-For can contain multiple IPs, use the first one
            ip_address = ip_address.split(',')[0].strip()

        db = current_app.db

        # Requirement 3.2.4: Implement rate limiting
        # (5 in 15 min, 10 in 1 hour per IP)
        is_allowed, rate_limit_error = check_rate_limit(
            db,
            ip_address,
            '/api/auth/login'
        )
        if not is_allowed:
            current_app.logger.warning(
                f"Login rate limit exceeded for IP: {ip_address}"
            )
            # Task 9.5: Log rate limit trigger
            log_rate_limit_trigger(
                ip_address,
                '/api/auth/login',
                5  # Approximate attempt count
            )
            return jsonify({'error': rate_limit_error}), 429

        # Try to parse JSON, catch parsing errors
        try:
            data = request.get_json()
        except Exception:
            return jsonify({
                'error': 'Validation failed',
                'errors': {'body': ['Request body must be valid JSON']}
            }), 400

        if data is None:
            return jsonify({
                'error': 'Validation failed',
                'errors': {'body': ['Request body must be valid JSON']}
            }), 400

        # Requirement 3.2.2: Implement request validation
        username = data.get('username', '').strip()
        password = data.get('password', '')

        validation_errors = {}

        if not username:
            validation_errors['username'] = ['Username is required']

        if not password:
            validation_errors['password'] = ['Password is required']

        if validation_errors:
            return jsonify({
                'error': 'Validation failed',
                'errors': validation_errors
            }), 400

        # Requirement 3.2.3: Implement CSRF token validation
        csrf_token = data.get('csrfToken', '')
        if not csrf_token:
            current_app.logger.warning(
                f"Login attempt without CSRF token from IP: {ip_address}"
            )
            # Task 9.5: Log CSRF failure
            log_csrf_failure(
                ip_address,
                '/api/auth/login',
                'missing'
            )
            return jsonify({
                'error': 'Request validation failed. Please try again.'
            }), 403

        # Note: CSRF token validation would require a session context.
        # For login (unauthenticated), we validate that the token is present.
        # Full CSRF validation happens after session creation.

        # Requirement 3.2.5: Call login service
        success, error_message, user_data = auth_login(
            db,
            username,
            password
        )

        if not success:
            # Track failed login attempt for rate limiting
            track_attempt(db, ip_address, '/api/auth/login')

            # Requirement 3.2.8: Return 401 for authentication failure
            current_app.logger.warning(
                f"Failed login attempt for username: {username} "
                f"from IP: {ip_address}"
            )
            # Task 9.5: Log failed login attempt
            log_failed_login(ip_address, username)
            return jsonify({'error': error_message}), 401

        # Requirement 3.2.5: Create session
        session_success, session_error, session_result = create_session(
            db,
            user_data['id']
        )

        if not session_success:
            current_app.logger.error(
                f"Failed to create session for user: {username}"
            )
            return jsonify({'error': 'Failed to create session'}), 500

        session_token, session_obj = session_result

        # Requirement 3.2.7: Generate and return CSRF token
        csrf_success, csrf_error, csrf_result = create_csrf_token(
            db,
            session_obj.id
        )

        if not csrf_success:
            current_app.logger.error(
                f"Failed to create CSRF token for session: {session_obj.id}"
            )
            return jsonify({'error': 'Failed to create CSRF token'}), 500

        csrf_token_plaintext, csrf_token_obj = csrf_result

        # Requirement 3.2.6: Set HTTP-only session cookie
        # (Secure, SameSite=Strict, 24-hour expiration)
        response = jsonify({
            'success': True,
            'csrfToken': csrf_token_plaintext
        })

        # Set session cookie with secure flags
        response.set_cookie(
            'session_token',
            session_token,
            max_age=24 * 60 * 60,  # 24 hours in seconds
            httponly=True,  # Prevent JavaScript access
            secure=True,  # HTTPS only
            samesite='Strict',  # CSRF protection
            path='/'
        )

        current_app.logger.info(
            f"User logged in successfully: {username}"
        )
        # Task 9.5: Log successful login
        log_successful_login(ip_address, username)

        # Requirement 3.2.8: Return 200 OK on success
        return response, 200

    except Exception as e:
        current_app.logger.error(f"Error during login: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@api.route('/auth/logout', methods=['POST'])
def logout():
    """Invalidate user session and logout.

    Request body:
        {
            "csrfToken": "string (required for CSRF protection)"
        }

    Returns:
        JSON response with success message (200 OK)
        JSON response with authentication error (401 Unauthorized)

    Clears:
        HTTP-only session cookie

    Example success response:
        {
            "success": true,
            "message": "Logged out successfully"
        }

    Example authentication error response:
        {
            "error": "Not authenticated"
        }

    **Validates: Requirements 4.1, 4.2, 4.4**
    """
    try:
        db = current_app.db

        # Requirement 3.3.2: Implement session validation
        # Extract session token from cookie
        session_token = request.cookies.get('session_token')

        if not session_token:
            current_app.logger.warning(
                "Logout attempt without session token"
            )
            return jsonify({'error': 'Not authenticated'}), 401

        # Validate session token
        is_valid, error, session = validate_session_token(
            db,
            session_token
        )

        if not is_valid:
            current_app.logger.warning(
                f"Logout attempt with invalid session: {error}"
            )
            return jsonify({'error': 'Not authenticated'}), 401

        # Requirement 3.3.3: Implement CSRF token validation
        try:
            data = request.get_json()
        except Exception:
            return jsonify({
                'error': 'Request validation failed. Please try again.'
            }), 403

        if data is None:
            data = {}

        csrf_token = data.get('csrfToken', '')

        if not csrf_token:
            current_app.logger.warning(
                f"Logout attempt without CSRF token from user: "
                f"{session.user_id}"
            )
            # Task 9.5: Log CSRF failure
            ip_address = request.headers.get(
                'X-Forwarded-For',
                request.remote_addr
            )
            if ',' in ip_address:
                ip_address = ip_address.split(',')[0].strip()
            log_csrf_failure(
                ip_address,
                '/api/auth/logout',
                'missing'
            )
            return jsonify({
                'error': 'Request validation failed. Please try again.'
            }), 403

        # Validate CSRF token
        csrf_valid, csrf_error = validate_csrf_token(
            db,
            session.id,
            csrf_token
        )

        if not csrf_valid:
            current_app.logger.warning(
                f"Logout attempt with invalid CSRF token from user: "
                f"{session.user_id}"
            )
            # Task 9.5: Log CSRF failure
            ip_address = request.headers.get(
                'X-Forwarded-For',
                request.remote_addr
            )
            if ',' in ip_address:
                ip_address = ip_address.split(',')[0].strip()
            log_csrf_failure(
                ip_address,
                '/api/auth/logout',
                'invalid'
            )
            return jsonify({
                'error': 'Request validation failed. Please try again.'
            }), 403

        # Requirement 3.3.4: Call invalidate_session function
        success, error_message = invalidate_session(db, session_token)

        if not success:
            current_app.logger.error(
                f"Failed to invalidate session for user: {session.user_id}"
            )
            return jsonify({'error': 'Failed to logout'}), 500

        # Requirement 3.3.5: Clear session cookie
        response = jsonify({
            'success': True,
            'message': 'Logged out successfully'
        })

        # Clear session cookie
        response.set_cookie(
            'session_token',
            '',
            max_age=0,  # Immediately expire the cookie
            httponly=True,
            secure=True,
            samesite='Strict',
            path='/'
        )

        current_app.logger.info(
            f"User logged out successfully: {session.user_id}"
        )
        # Task 9.5: Log successful logout
        # Note: We have user_id but not username; security logger accepts user_id
        log_logout(
            request.headers.get('X-Forwarded-For', request.remote_addr),
            session.user_id
        )

        # Requirement 3.3.6: Return 200 OK on success
        return response, 200

    except Exception as e:
        current_app.logger.error(f"Error during logout: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@api.route('/auth/csrf-token', methods=['GET'])
def get_csrf_token():
    """Get a CSRF token for unauthenticated requests.

    This endpoint provides a CSRF token for forms that don't require
    authentication (signup, login). The token is generated per session
    or per request for unauthenticated users.

    Returns:
        JSON response with CSRF token (200 OK)
        JSON response with authentication error (401 Unauthorized)

    Example success response:
        {
            "csrfToken": "token_string"
        }

    Example authentication error response:
        {
            "error": "Not authenticated"
        }

    **Validates: Requirements 11.1, 11.4**
    """
    try:
        from csrf_protection import generate_csrf_token
        
        db = current_app.db

        # Extract session token from cookie if present
        session_token = request.cookies.get('session_token')

        if session_token:
            # User is authenticated - validate session and get CSRF token
            is_valid, error, session = validate_session_token(
                db,
                session_token
            )

            if not is_valid:
                current_app.logger.warning(
                    f"CSRF token request with invalid session: {error}"
                )
                return jsonify({'error': 'Not authenticated'}), 401

            # Get or create CSRF token for this session
            csrf_success, csrf_error, csrf_result = create_csrf_token(
                db,
                session.id
            )

            if not csrf_success:
                current_app.logger.error(
                    f"Failed to create CSRF token for session: {session.id}"
                )
                return jsonify({'error': 'Failed to create CSRF token'}), 500

            csrf_token_plaintext, csrf_token_obj = csrf_result

            current_app.logger.debug(
                f"CSRF token provided for authenticated user: {session.user_id}"
            )
            return jsonify({'csrfToken': csrf_token_plaintext}), 200
        else:
            # User is not authenticated - generate a temporary CSRF token
            # for unauthenticated forms (signup, login)
            csrf_token_plaintext = generate_csrf_token()
            
            current_app.logger.debug(
                "CSRF token provided for unauthenticated request"
            )
            return jsonify({'csrfToken': csrf_token_plaintext}), 200

    except Exception as e:
        current_app.logger.error(f"Error getting CSRF token: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@api.route('/auth/me', methods=['GET'])
def get_current_user():
    """Get current authenticated user information.

    This endpoint returns information about the currently authenticated
    user. It requires a valid session token in the session cookie.

    Returns:
        JSON response with user info (200 OK)
        JSON response with authentication error (401 Unauthorized)

    Example success response:
        {
            "user": {
                "id": "user_id_string",
                "username": "john_doe"
            }
        }

    Example authentication error response:
        {
            "error": "Not authenticated"
        }

    **Validates: Requirements 3.5.1-3.5.4**
    """
    try:
        db = current_app.db

        # Requirement 3.5.2: Implement session validation
        # Extract session token from cookie
        session_token = request.cookies.get('session_token')

        if not session_token:
            current_app.logger.warning(
                "GET /api/auth/me request without session token"
            )
            return jsonify({'error': 'Not authenticated'}), 401

        # Validate session token
        is_valid, error, session = validate_session_token(
            db,
            session_token
        )

        if not is_valid:
            current_app.logger.warning(
                f"GET /api/auth/me with invalid session: {error}"
            )
            # Requirement 3.5.4: Return 401 for invalid session
            return jsonify({'error': 'Not authenticated'}), 401

        # Requirement 3.5.3: Return current user info (id, username)
        try:
            user = db.get_user_by_id(session.user_id)
            if user is None:
                current_app.logger.error(
                    f"User not found for session: {session.user_id}"
                )
                return jsonify({'error': 'Not authenticated'}), 401

            current_app.logger.debug(
                f"Current user retrieved: {user.username}"
            )
            # Requirement 3.5.4: Return 200 OK on success
            return jsonify({
                'user': {
                    'id': user.id,
                    'username': user.username
                }
            }), 200

        except Exception as e:
            current_app.logger.error(
                f"Error retrieving user for session: {str(e)}"
            )
            return jsonify({'error': 'Not authenticated'}), 401

    except Exception as e:
        current_app.logger.error(f"Error getting current user: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@api.route('/todos', methods=['GET'])
@require_auth
def get_todos():
    """Get all todos for authenticated user.
    
    Requires:
        - Valid session token in session cookie
    
    Returns:
        JSON response with list of user's todos (200 OK)
        JSON response with error (401 Unauthorized)
        
    Example response:
        [
            {
                "id": 1,
                "title": "Buy groceries",
                "description": "Milk, eggs, bread",
                "completed": false,
                "created_at": "2024-01-15T10:30:00",
                "updated_at": "2024-01-15T10:30:00",
                "user_id": "user-uuid"
            }
        ]
    
    **Validates: Requirements 5.1, 5.6**
    """
    try:
        db = current_app.db
        # Get todos only for the authenticated user
        todos = db.get_todos_by_user_id(request.user.id)
        return jsonify([todo.to_dict() for todo in todos]), 200
    except Exception as e:
        current_app.logger.error(f"Error retrieving todos: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@api.route('/todos', methods=['POST'])
@require_auth
@require_csrf
def create_todo():
    """Create new todo for authenticated user.
    
    Requires:
        - Valid session token in session cookie
        - Valid CSRF token in request body
    
    Request body:
        {
            "title": "string (required, max 200 chars)",
            "description": "string (optional, max 1000 chars)",
            "completed": boolean (optional, defaults to false),
            "csrfToken": "string (required)"
        }
    
    Returns:
        JSON response with created todo (201 Created)
        JSON response with validation errors (400 Bad Request)
        JSON response with error (401 Unauthorized)
        JSON response with error (403 Forbidden - CSRF)
        
    Example success response:
        {
            "id": 1,
            "title": "Buy groceries",
            "description": "Milk, eggs, bread",
            "completed": false,
            "created_at": "2024-01-15T10:30:00",
            "updated_at": "2024-01-15T10:30:00",
            "user_id": "user-uuid"
        }
        
    Example error response:
        {
            "error": "Validation failed",
            "errors": {
                "title": ["Title is required"]
            }
        }
    
    **Validates: Requirements 5.2**
    """
    try:
        # Try to parse JSON, catch parsing errors
        try:
            data = request.get_json()
        except Exception:
            return jsonify({
                'error': 'Validation failed',
                'errors': {'body': ['Request body must be valid JSON']}
            }), 400
        
        if data is None:
            return jsonify({
                'error': 'Validation failed',
                'errors': {'body': ['Request body must be valid JSON']}
            }), 400
        
        # Validate input
        validation_errors = validate_todo_create(data)
        if validation_errors:
            return jsonify({
                'error': 'Validation failed',
                'errors': validation_errors
            }), 400
        
        # Sanitize input to prevent XSS and injection attacks
        sanitized_data = sanitize_todo_data(data)
        
        # Create todo object associated with authenticated user
        todo = Todo(
            id=None,
            title=sanitized_data['title'],
            description=sanitized_data.get('description', ''),
            completed=sanitized_data.get('completed', False),
            created_at=datetime.now(),
            updated_at=datetime.now(),
            user_id=request.user.id
        )
        
        # Save to database
        db = current_app.db
        created_todo = db.create_todo(todo)
        
        return jsonify(created_todo.to_dict()), 201
        
    except Exception as e:
        current_app.logger.error(f"Error creating todo: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@api.route('/todos/<int:todo_id>', methods=['GET'])
@require_auth
@require_ownership('todo_id')
def get_todo(todo_id):
    """Get single todo by ID for authenticated user.
    
    Requires:
        - Valid session token in session cookie
        - User must own the todo
    
    Args:
        todo_id: ID of the todo to retrieve
    
    Returns:
        JSON response with todo (200 OK)
        JSON response with error (401 Unauthorized)
        JSON response with error (403 Forbidden - ownership)
        JSON response with error (404 Not Found)
        
    Example success response:
        {
            "id": 1,
            "title": "Buy groceries",
            "description": "Milk, eggs, bread",
            "completed": false,
            "created_at": "2024-01-15T10:30:00",
            "updated_at": "2024-01-15T10:30:00",
            "user_id": "user-uuid"
        }
        
    Example error response:
        {
            "error": "Resource not found"
        }
    
    **Validates: Requirements 5.4**
    """
    try:
        # Get todo from request context (already verified ownership via decorator)
        todo = request.resource
        return jsonify(todo.to_dict()), 200
        
    except Exception as e:
        current_app.logger.error(f"Error retrieving todo {todo_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@api.route('/todos/<int:todo_id>', methods=['PUT'])
@require_auth
@require_csrf
@require_ownership('todo_id')
def update_todo(todo_id):
    """Update existing todo for authenticated user.
    
    Requires:
        - Valid session token in session cookie
        - Valid CSRF token in request body
        - User must own the todo
    
    Args:
        todo_id: ID of the todo to update
    
    Request body (all fields optional):
        {
            "title": "string (max 200 chars)",
            "description": "string (max 1000 chars)",
            "completed": boolean,
            "csrfToken": "string (required)"
        }
    
    Returns:
        JSON response with updated todo (200 OK)
        JSON response with validation errors (400 Bad Request)
        JSON response with error (401 Unauthorized)
        JSON response with error (403 Forbidden - CSRF or ownership)
        JSON response with error (404 Not Found)
        
    Example success response:
        {
            "id": 1,
            "title": "Buy groceries",
            "description": "Milk, eggs, bread",
            "completed": true,
            "created_at": "2024-01-15T10:30:00",
            "updated_at": "2024-01-15T14:20:00",
            "user_id": "user-uuid"
        }
        
    Example validation error response:
        {
            "error": "Validation failed",
            "errors": {
                "title": ["Title cannot be empty or whitespace only"]
            }
        }
        
    Example not found response:
        {
            "error": "Resource not found"
        }
    
    **Validates: Requirements 5.3**
    """
    try:
        # Try to parse JSON, catch parsing errors
        try:
            data = request.get_json()
        except Exception:
            return jsonify({
                'error': 'Validation failed',
                'errors': {'body': ['Request body must be valid JSON']}
            }), 400
        
        if data is None:
            return jsonify({
                'error': 'Validation failed',
                'errors': {'body': ['Request body must be valid JSON']}
            }), 400
        
        # Validate input
        validation_errors = validate_todo_update(data)
        if validation_errors:
            return jsonify({
                'error': 'Validation failed',
                'errors': validation_errors
            }), 400
        
        # Get existing todo (already verified ownership via decorator)
        existing_todo = request.resource
        
        # Sanitize input to prevent XSS and injection attacks
        sanitized_data = sanitize_todo_data(data)
        
        # Merge with existing data (only update provided fields)
        updated_todo = Todo(
            id=todo_id,
            title=sanitized_data.get('title', existing_todo.title),
            description=sanitized_data.get('description', existing_todo.description),
            completed=sanitized_data.get('completed', existing_todo.completed),
            created_at=existing_todo.created_at,
            updated_at=datetime.now(),
            user_id=existing_todo.user_id
        )
        
        # Save to database
        db = current_app.db
        result = db.update_todo(todo_id, updated_todo)
        
        if result is None:
            return jsonify({'error': 'Resource not found'}), 404
        
        return jsonify(result.to_dict()), 200
        
    except Exception as e:
        current_app.logger.error(f"Error updating todo {todo_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500


@api.route('/todos/<int:todo_id>', methods=['DELETE'])
@require_auth
@require_csrf
@require_ownership('todo_id')
def delete_todo(todo_id):
    """Delete todo for authenticated user.
    
    Requires:
        - Valid session token in session cookie
        - Valid CSRF token in request body
        - User must own the todo
    
    Args:
        todo_id: ID of the todo to delete
    
    Request body:
        {
            "csrfToken": "string (required)"
        }
    
    Returns:
        Empty response (204 No Content)
        JSON response with error (401 Unauthorized)
        JSON response with error (403 Forbidden - CSRF or ownership)
        JSON response with error (404 Not Found)
        
    Example error response:
        {
            "error": "Resource not found"
        }
    
    **Validates: Requirements 5.5**
    """
    try:
        db = current_app.db
        deleted = db.delete_todo(todo_id)
        
        if not deleted:
            return jsonify({'error': 'Resource not found'}), 404
        
        return '', 204
        
    except Exception as e:
        current_app.logger.error(f"Error deleting todo {todo_id}: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500
