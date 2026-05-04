"""Session token generation and management for user authentication.

This module provides secure session token generation, validation, and
lifecycle management. Session tokens are cryptographically secure,
stored with hashed values in the database, and expire after 24 hours.
"""

import secrets
import hashlib
import logging
from typing import Optional, Tuple
from datetime import datetime, timedelta
from models import Session


logger = logging.getLogger(__name__)

# Session configuration
SESSION_DURATION_HOURS = 24
SESSION_TOKEN_LENGTH = 32  # 256 bits of entropy


def generate_session_token() -> str:
    """Generate a cryptographically secure session token.

    Uses secrets.token_urlsafe() to generate a URL-safe random token
    with sufficient entropy for secure session identification.

    Returns:
        URL-safe random token string (base64-encoded)

    **Validates: Requirements 10.1**
    """
    return secrets.token_urlsafe(SESSION_TOKEN_LENGTH)


def hash_token(token: str) -> str:
    """Hash a session token for secure storage.

    Uses SHA-256 to hash tokens before storing in database.
    This ensures that even if the database is compromised,
    tokens cannot be used directly.

    Args:
        token: Token to hash

    Returns:
        SHA-256 hash of token as hex string
    """
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def create_session(
    db,
    user_id: str
) -> Tuple[bool, Optional[str], Optional[Tuple[str, Session]]]:
    """Create a new session for a user.

    Generates a session token, hashes it, stores it in the database
    with a 24-hour expiration time, and returns the plaintext token
    (which should be sent to the client in an HTTP-only cookie).

    Args:
        db: TodoDatabase instance for database operations
        user_id: ID of user to create session for

    Returns:
        Tuple of (success, error_message, (token, session))
        - success: True if session created, False otherwise
        - error_message: None if successful, error message if failed
        - (token, session): Plaintext token and Session object if successful

    **Validates: Requirements 2.5, 3.1, 10.6**
    """
    try:
        # Generate token
        token = generate_session_token()
        token_hash = hash_token(token)

        # Calculate expiration (24 hours from now)
        now = datetime.now()
        expires_at = now + timedelta(hours=SESSION_DURATION_HOURS)

        # Create session in database
        session = db.create_session(user_id, token_hash, expires_at)

        logger.info(f"Session created for user: {user_id}")
        return True, None, (token, session)

    except Exception as e:
        logger.error(f"Failed to create session: {str(e)}")
        return False, "Failed to create session", None


def validate_session_token(
    db,
    token: str
) -> Tuple[bool, Optional[str], Optional[Session]]:
    """Validate a session token and retrieve associated session.

    Hashes the provided token and looks it up in the database.
    Checks that the session exists and has not expired.

    Args:
        db: TodoDatabase instance for database operations
        token: Session token to validate

    Returns:
        Tuple of (is_valid, error_message, session)
        - is_valid: True if token is valid and not expired
        - error_message: None if valid, error message if invalid
        - session: Session object if valid, None otherwise

    **Validates: Requirements 3.2, 3.3, 3.4**
    """
    if not isinstance(token, str) or not token:
        return False, "Invalid token", None

    try:
        token_hash = hash_token(token)
        session = db.get_session_by_token_hash(token_hash)

        if session is None:
            logger.warning("Session validation failed: token not found")
            return False, "Invalid token", None

        # Check if session has expired
        now = datetime.now()
        if now > session.expires_at:
            logger.warning(f"Session validation failed: token expired")
            return False, "Session expired", None

        logger.debug(f"Session validated for user: {session.user_id}")
        return True, None, session

    except Exception as e:
        logger.error(f"Session validation error: {str(e)}")
        return False, "Session validation failed", None


def get_user_from_session(
    db,
    token: str
) -> Tuple[bool, Optional[str], Optional[dict]]:
    """Get user information from a valid session token.

    Validates the session token and retrieves the associated user.

    Args:
        db: TodoDatabase instance for database operations
        token: Session token to validate

    Returns:
        Tuple of (success, error_message, user_data)
        - success: True if user retrieved, False otherwise
        - error_message: None if successful, error message if failed
        - user_data: User dict if successful, None otherwise

    **Validates: Requirements 3.2, 3.6**
    """
    # Validate session token
    is_valid, error, session = validate_session_token(db, token)
    if not is_valid:
        return False, error, None

    try:
        # Retrieve user
        user = db.get_user_by_id(session.user_id)
        if user is None:
            logger.error(f"User not found for session: {session.user_id}")
            return False, "User not found", None

        logger.debug(f"User retrieved from session: {user.username}")
        return True, None, user.to_dict()

    except Exception as e:
        logger.error(f"Failed to retrieve user from session: {str(e)}")
        return False, "Failed to retrieve user", None


def invalidate_session(
    db,
    token: str
) -> Tuple[bool, Optional[str]]:
    """Invalidate a session token (logout).

    Deletes the session from the database, preventing further use
    of the token.

    Args:
        db: TodoDatabase instance for database operations
        token: Session token to invalidate

    Returns:
        Tuple of (success, error_message)
        - success: True if session invalidated, False otherwise
        - error_message: None if successful, error message if failed

    **Validates: Requirements 4.1, 4.4**
    """
    try:
        token_hash = hash_token(token)
        session = db.get_session_by_token_hash(token_hash)

        if session is None:
            logger.warning("Logout attempt with invalid token")
            return False, "Invalid token"

        # Delete session from database
        db.delete_session(session.id)

        logger.info(f"Session invalidated for user: {session.user_id}")
        return True, None

    except Exception as e:
        logger.error(f"Failed to invalidate session: {str(e)}")
        return False, "Failed to invalidate session"
