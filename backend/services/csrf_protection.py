"""CSRF token generation and validation for cross-site request forgery protection.

This module provides secure CSRF token generation, validation, and rotation.
Each session gets a unique CSRF token that must be included in state-changing
requests (POST, PUT, DELETE).
"""

import secrets
import hashlib
import logging
from typing import Optional, Tuple
from datetime import datetime, timedelta
from models import CSRFToken


logger = logging.getLogger(__name__)

# CSRF token configuration
CSRF_TOKEN_LENGTH = 32  # 256 bits of entropy
CSRF_TOKEN_DURATION_HOURS = 24


def generate_csrf_token() -> str:
    """Generate a cryptographically secure CSRF token.

    Uses secrets.token_urlsafe() to generate a URL-safe random token
    with sufficient entropy for secure CSRF protection.

    Returns:
        URL-safe random token string (base64-encoded)

    **Validates: Requirements 11.4**
    """
    return secrets.token_urlsafe(CSRF_TOKEN_LENGTH)


def hash_token(token: str) -> str:
    """Hash a CSRF token for secure storage.

    Uses SHA-256 to hash tokens before storing in database.
    This ensures that even if the database is compromised,
    tokens cannot be used directly.

    Args:
        token: Token to hash

    Returns:
        SHA-256 hash of token as hex string
    """
    return hashlib.sha256(token.encode('utf-8')).hexdigest()


def create_csrf_token(
    db,
    session_id: str
) -> Tuple[bool, Optional[str], Optional[Tuple[str, CSRFToken]]]:
    """Create a new CSRF token for a session.

    Generates a CSRF token, hashes it, stores it in the database
    with a 24-hour expiration time, and returns the plaintext token
    (which should be sent to the client).

    Args:
        db: TodoDatabase instance for database operations
        session_id: ID of session to create CSRF token for

    Returns:
        Tuple of (success, error_message, (token, csrf_token))
        - success: True if token created, False otherwise
        - error_message: None if successful, error message if failed
        - (token, csrf_token): Plaintext token and CSRFToken object if successful

    **Validates: Requirements 11.4**
    """
    try:
        # Generate token
        token = generate_csrf_token()
        token_hash = hash_token(token)

        # Calculate expiration (24 hours from now)
        now = datetime.now()
        expires_at = now + timedelta(hours=CSRF_TOKEN_DURATION_HOURS)

        # Create CSRF token in database
        csrf_token = db.create_csrf_token(session_id, token_hash, expires_at)

        logger.info(f"CSRF token created for session: {session_id}")
        return True, None, (token, csrf_token)

    except Exception as e:
        logger.error(f"Failed to create CSRF token: {str(e)}")
        return False, "Failed to create CSRF token", None


def validate_csrf_token(
    db,
    session_id: str,
    token: str
) -> Tuple[bool, Optional[str]]:
    """Validate a CSRF token for a session.

    Hashes the provided token and looks it up in the database.
    Checks that the token exists, belongs to the session, and has not expired.

    Args:
        db: TodoDatabase instance for database operations
        session_id: Session ID the token should belong to
        token: CSRF token to validate

    Returns:
        Tuple of (is_valid, error_message)
        - is_valid: True if token is valid and not expired
        - error_message: None if valid, error message if invalid

    **Validates: Requirements 11.1, 11.3**
    """
    if not isinstance(token, str) or not token:
        logger.warning("CSRF validation failed: empty token")
        return False, "Invalid CSRF token"

    try:
        token_hash = hash_token(token)
        csrf_token = db.get_csrf_token_by_hash(token_hash)

        if csrf_token is None:
            logger.warning("CSRF validation failed: token not found")
            return False, "Invalid CSRF token"

        # Check if token belongs to the correct session
        if csrf_token.session_id != session_id:
            logger.warning(
                f"CSRF validation failed: token session mismatch "
                f"(expected {session_id}, got {csrf_token.session_id})"
            )
            return False, "Invalid CSRF token"

        # Check if token has expired
        now = datetime.now()
        if now > csrf_token.expires_at:
            logger.warning("CSRF validation failed: token expired")
            return False, "CSRF token expired"

        logger.debug(f"CSRF token validated for session: {session_id}")
        return True, None

    except Exception as e:
        logger.error(f"CSRF validation error: {str(e)}")
        return False, "CSRF validation failed"


def rotate_csrf_token(
    db,
    session_id: str,
    old_token: str
) -> Tuple[bool, Optional[str], Optional[Tuple[str, CSRFToken]]]:
    """Rotate CSRF token after a state-changing request.

    Validates the old token, deletes it, and creates a new token.
    This prevents token reuse and ensures fresh tokens for each request.

    Args:
        db: TodoDatabase instance for database operations
        session_id: Session ID the token belongs to
        old_token: Current CSRF token to rotate

    Returns:
        Tuple of (success, error_message, (new_token, csrf_token))
        - success: True if token rotated, False otherwise
        - error_message: None if successful, error message if failed
        - (new_token, csrf_token): New plaintext token and CSRFToken object if successful

    **Validates: Requirements 11.4**
    """
    try:
        # Validate old token
        is_valid, error = validate_csrf_token(db, session_id, old_token)
        if not is_valid:
            logger.warning(f"CSRF rotation failed: {error}")
            return False, error, None

        # Delete old token
        old_token_hash = hash_token(old_token)
        csrf_token_obj = db.get_csrf_token_by_hash(old_token_hash)
        if csrf_token_obj:
            db.delete_csrf_token(csrf_token_obj.id)

        # Create new token
        success, error, result = create_csrf_token(db, session_id)
        if success:
            logger.info(f"CSRF token rotated for session: {session_id}")
        else:
            logger.error(f"CSRF rotation failed: {error}")

        return success, error, result

    except Exception as e:
        logger.error(f"CSRF rotation error: {str(e)}")
        return False, "CSRF rotation failed", None
