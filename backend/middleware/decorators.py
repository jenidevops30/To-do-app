"""Authentication and authorization decorators for protecting routes.

This module provides decorators for enforcing authentication, CSRF token
validation, and ownership verification on protected routes.
"""

from functools import wraps
from flask import request, jsonify, current_app
from services.session_manager import validate_session_token
from services.csrf_protection import validate_csrf_token
import logging


logger = logging.getLogger(__name__)


def require_auth(f):
    """Decorator to require valid session authentication.

    This decorator checks for a valid session token in the session cookie
    and validates it. If the session is invalid or missing, returns 401
    Unauthorized.

    The decorator adds the following to the request context:
    - request.user: User object for the authenticated user
    - request.session: Session object for the current session

    Usage:
        @api.route('/protected')
        @require_auth
        def protected_route():
            return jsonify({'user_id': request.user.id})

    Returns:
        401 Unauthorized if session is invalid or missing
        Calls wrapped function if session is valid

    **Validates: Requirements 3.2, 3.6, 10.5**
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            db = current_app.db

            # Extract session token from cookie
            session_token = request.cookies.get('session_token')

            if not session_token:
                current_app.logger.warning(
                    f"Protected route accessed without session token: "
                    f"{request.path}"
                )
                return jsonify({'error': 'Not authenticated'}), 401

            # Validate session token
            is_valid, error, session = validate_session_token(
                db,
                session_token
            )

            if not is_valid:
                current_app.logger.warning(
                    f"Protected route accessed with invalid session: "
                    f"{error} - {request.path}"
                )
                return jsonify({'error': 'Not authenticated'}), 401

            # Retrieve user from session
            user = db.get_user_by_id(session.user_id)
            if user is None:
                current_app.logger.error(
                    f"User not found for session: {session.user_id}"
                )
                return jsonify({'error': 'Not authenticated'}), 401

            # Store user and session in request context for use in route
            request.user = user
            request.session = session

            current_app.logger.debug(
                f"User authenticated for route: {request.path} - "
                f"user: {user.username}"
            )

            return f(*args, **kwargs)

        except Exception as e:
            current_app.logger.error(
                f"Error in require_auth decorator: {str(e)}"
            )
            return jsonify({'error': 'Internal server error'}), 500

    return decorated_function


def require_csrf(f):
    """Decorator to require valid CSRF token for state-changing requests.

    This decorator validates the CSRF token for POST, PUT, DELETE requests.
    The token should be provided in the request body as 'csrfToken'.

    This decorator should be used in combination with @require_auth for
    protected routes that modify state.

    Usage:
        @api.route('/protected', methods=['POST'])
        @require_auth
        @require_csrf
        def protected_post():
            return jsonify({'success': True})

    Returns:
        403 Forbidden if CSRF token is invalid or missing
        Calls wrapped function if CSRF token is valid

    **Validates: Requirements 11.1, 11.3**
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            # Only validate CSRF for state-changing requests
            if request.method not in ['POST', 'PUT', 'DELETE', 'PATCH']:
                return f(*args, **kwargs)

            db = current_app.db

            # Get session from request context (set by @require_auth)
            if not hasattr(request, 'session'):
                current_app.logger.warning(
                    f"CSRF validation without session context: {request.path}"
                )
                return jsonify({
                    'error': 'Request validation failed. Please try again.'
                }), 403

            # Extract CSRF token from request body
            try:
                data = request.get_json()
            except Exception:
                data = {}

            if data is None:
                data = {}

            csrf_token = data.get('csrfToken', '')

            if not csrf_token:
                current_app.logger.warning(
                    f"State-changing request without CSRF token: "
                    f"{request.path} - user: {request.user.username}"
                )
                return jsonify({
                    'error': 'Request validation failed. Please try again.'
                }), 403

            # Validate CSRF token
            csrf_valid, csrf_error = validate_csrf_token(
                db,
                request.session.id,
                csrf_token
            )

            if not csrf_valid:
                current_app.logger.warning(
                    f"Invalid CSRF token for request: {request.path} - "
                    f"user: {request.user.username} - error: {csrf_error}"
                )
                return jsonify({
                    'error': 'Request validation failed. Please try again.'
                }), 403

            current_app.logger.debug(
                f"CSRF token validated for request: {request.path} - "
                f"user: {request.user.username}"
            )

            return f(*args, **kwargs)

        except Exception as e:
            current_app.logger.error(
                f"Error in require_csrf decorator: {str(e)}"
            )
            return jsonify({
                'error': 'Request validation failed. Please try again.'
            }), 403

    return decorated_function


def require_ownership(resource_id_param='id'):
    """Decorator to verify user owns the resource being accessed.

    This decorator checks that the authenticated user owns the resource
    being accessed. It requires the resource to have a 'user_id' field
    in the database.

    This decorator should be used in combination with @require_auth for
    routes that access user-specific resources.

    Args:
        resource_id_param: Name of the URL parameter containing resource ID
                          (default: 'id')

    Usage:
        @api.route('/todos/<int:id>', methods=['GET'])
        @require_auth
        @require_ownership('id')
        def get_todo(id):
            return jsonify({'todo': request.resource})

    Returns:
        403 Forbidden if user does not own the resource
        404 Not Found if resource does not exist
        Calls wrapped function if user owns the resource

    **Validates: Requirements 5.3, 5.4, 5.5**
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            try:
                # Get resource ID from URL parameters
                resource_id = kwargs.get(resource_id_param)

                if resource_id is None:
                    current_app.logger.error(
                        f"require_ownership: resource_id_param '{resource_id_param}' "
                        f"not found in route parameters"
                    )
                    return jsonify({'error': 'Internal server error'}), 500

                db = current_app.db

                # Get user from request context (set by @require_auth)
                if not hasattr(request, 'user'):
                    current_app.logger.warning(
                        f"Ownership check without user context: {request.path}"
                    )
                    return jsonify({'error': 'Not authenticated'}), 401

                # Retrieve the resource (assuming it's a todo)
                # This assumes the resource has a user_id field
                resource = db.get_todo_by_id(resource_id)

                if resource is None:
                    current_app.logger.warning(
                        f"Resource not found: {resource_id} - "
                        f"user: {request.user.username}"
                    )
                    return jsonify({'error': 'Resource not found'}), 404

                # Check if resource has user_id field
                if not hasattr(resource, 'user_id'):
                    current_app.logger.error(
                        f"Resource does not have user_id field: {resource_id}"
                    )
                    return jsonify({'error': 'Internal server error'}), 500

                # Verify ownership
                if resource.user_id != request.user.id:
                    current_app.logger.warning(
                        f"Unauthorized access attempt to resource: {resource_id} - "
                        f"user: {request.user.username} - "
                        f"owner: {resource.user_id}"
                    )
                    return jsonify({
                        'error': 'You do not have permission to access this resource'
                    }), 403

                # Store resource in request context for use in route
                request.resource = resource

                current_app.logger.debug(
                    f"Ownership verified for resource: {resource_id} - "
                    f"user: {request.user.username}"
                )

                return f(*args, **kwargs)

            except Exception as e:
                current_app.logger.error(
                    f"Error in require_ownership decorator: {str(e)}"
                )
                return jsonify({'error': 'Internal server error'}), 500

        return decorated_function

    return decorator
