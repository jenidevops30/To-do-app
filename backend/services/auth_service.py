"""Authentication service for user account management and credential verification.

This module provides secure password hashing, verification, and user account
management functions. All passwords are hashed using bcrypt with a minimum
cost factor of 10 to ensure security even if the database is compromised.
"""

import bcrypt
import re
import logging
from typing import Optional, Tuple
from datetime import datetime


logger = logging.getLogger(__name__)

# Password validation constants
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128
MIN_USERNAME_LENGTH = 3
MAX_USERNAME_LENGTH = 50
BCRYPT_COST_FACTOR = 10


def hash_password(password: str) -> str:
    """Hash a plaintext password using bcrypt with cost factor 10+.

    This function uses bcrypt to hash passwords securely. The cost factor
    of 10 ensures that password hashing is computationally expensive,
    making brute force attacks impractical.

    Args:
        password: Plaintext password to hash (8-128 characters)

    Returns:
        Bcrypt password hash as a string (will be stored in database)

    Raises:
        ValueError: If password is invalid (wrong length)
        TypeError: If password is not a string

    **Validates: Requirements 1.7, 1.8, 9.1**
    """
    if not isinstance(password, str):
        raise TypeError("Password must be a string")

    if len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError(
            f"Password must be at least {MIN_PASSWORD_LENGTH} characters"
        )

    if len(password) > MAX_PASSWORD_LENGTH:
        raise ValueError(
            f"Password must be at most {MAX_PASSWORD_LENGTH} characters"
        )

    # Hash password with bcrypt using cost factor 10+
    salt = bcrypt.gensalt(rounds=BCRYPT_COST_FACTOR)
    password_hash = bcrypt.hashpw(password.encode('utf-8'), salt)

    return password_hash.decode('utf-8')


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a plaintext password against a bcrypt hash.

    This function uses bcrypt's constant-time comparison to prevent
    timing attacks. It safely handles invalid hashes without raising
    exceptions.

    Args:
        password: Plaintext password to verify
        password_hash: Bcrypt hash to verify against

    Returns:
        True if password matches hash, False otherwise

    **Validates: Requirements 9.5**
    """
    if not isinstance(password, str):
        return False

    if not isinstance(password_hash, str):
        return False

    try:
        # bcrypt.checkpw uses constant-time comparison
        return bcrypt.checkpw(
            password.encode('utf-8'),
            password_hash.encode('utf-8')
        )
    except (ValueError, TypeError):
        # Invalid hash format - return False without raising
        return False


def validate_username(username: str) -> Tuple[bool, Optional[str]]:
    """Validate username format and length.

    Username must be 3-50 characters and contain only alphanumeric
    characters and underscores (no spaces or special characters).

    Args:
        username: Username to validate

    Returns:
        Tuple of (is_valid, error_message)
        - is_valid: True if username is valid, False otherwise
        - error_message: None if valid, error message if invalid

    **Validates: Requirements 1.5, 1.6**
    """
    if not isinstance(username, str):
        return False, "Username must be a string"

    if len(username) < MIN_USERNAME_LENGTH:
        return (
            False,
            f"Username must be at least {MIN_USERNAME_LENGTH} characters"
        )

    if len(username) > MAX_USERNAME_LENGTH:
        return (
            False,
            f"Username must be at most {MAX_USERNAME_LENGTH} characters"
        )

    # Check for valid characters (alphanumeric + underscore)
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        return (
            False,
            "Username can only contain letters, numbers, and underscores"
        )

    return True, None


def validate_password(password: str) -> Tuple[bool, Optional[str]]:
    """Validate password strength requirements.

    Password must be at least 8 characters and contain both letters
    and numbers (no special characters required, but allowed).

    Args:
        password: Password to validate

    Returns:
        Tuple of (is_valid, error_message)
        - is_valid: True if password is valid, False otherwise
        - error_message: None if valid, error message if invalid

    **Validates: Requirements 1.3, 1.4**
    """
    if not isinstance(password, str):
        return False, "Password must be a string"

    if len(password) < MIN_PASSWORD_LENGTH:
        return (
            False,
            f"Password must be at least {MIN_PASSWORD_LENGTH} characters"
        )

    if len(password) > MAX_PASSWORD_LENGTH:
        return (
            False,
            f"Password must be at most {MAX_PASSWORD_LENGTH} characters"
        )

    # Check for at least one letter
    has_letter = any(c.isalpha() for c in password)
    if not has_letter:
        return (
            False,
            "Password must contain at least one letter"
        )

    # Check for at least one number
    has_number = any(c.isdigit() for c in password)
    if not has_number:
        return (
            False,
            "Password must contain at least one number"
        )

    return True, None


def signup(
    db,
    username: str,
    password: str
) -> Tuple[bool, Optional[str], Optional[dict]]:
    """Create a new user account with username and password.

    This function validates the username and password, checks for
    duplicate usernames, hashes the password, and creates a new
    user record in the database.

    Args:
        db: TodoDatabase instance for database operations
        username: Username for new account (3-50 chars, alphanumeric + _)
        password: Password for new account (8+ chars, letters and numbers)

    Returns:
        Tuple of (success, error_message, user_data)
        - success: True if signup succeeded, False otherwise
        - error_message: None if successful, error message if failed
        - user_data: User dict if successful, None if failed

    **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8**
    """
    # Validate username format
    username_valid, username_error = validate_username(username)
    if not username_valid:
        logger.warning(f"Invalid username format: {username_error}")
        return False, username_error, None

    # Validate password strength
    password_valid, password_error = validate_password(password)
    if not password_valid:
        logger.warning(f"Invalid password format: {password_error}")
        return False, password_error, None

    # Check for duplicate username
    existing_user = db.get_user_by_username(username)
    if existing_user is not None:
        logger.warning(f"Signup attempt with existing username: {username}")
        return False, "Username already taken", None

    # Hash password
    try:
        password_hash = hash_password(password)
    except (ValueError, TypeError) as e:
        logger.error(f"Password hashing failed: {str(e)}")
        return False, "Password validation failed", None

    # Create user in database
    try:
        user = db.create_user(username, password_hash)
        logger.info(f"User account created: {username}")
        return True, None, user.to_dict()
    except Exception as e:
        logger.error(f"Failed to create user account: {str(e)}")
        return False, "Failed to create account", None


def login(
    db,
    username: str,
    password: str
) -> Tuple[bool, Optional[str], Optional[dict]]:
    """Authenticate a user with username and password.

    This function retrieves the user by username, verifies the password
    against the stored hash, and returns the user data if successful.
    Uses generic error messages to prevent username enumeration attacks.

    Args:
        db: TodoDatabase instance for database operations
        username: Username to authenticate
        password: Password to verify

    Returns:
        Tuple of (success, error_message, user_data)
        - success: True if login succeeded, False otherwise
        - error_message: None if successful, generic error if failed
        - user_data: User dict if successful, None if failed

    **Validates: Requirements 2.1, 2.2, 2.3, 2.4**
    """
    # Generic error message to prevent username enumeration
    generic_error = "Invalid credentials"

    # Retrieve user by username
    try:
        user = db.get_user_by_username(username)
    except Exception as e:
        logger.error(f"Database error during login: {str(e)}")
        return False, generic_error, None

    # Check if user exists (use generic error)
    if user is None:
        logger.warning(f"Login attempt with non-existent username: {username}")
        return False, generic_error, None

    # Verify password (use generic error)
    if not verify_password(password, user.password_hash):
        logger.warning(f"Failed login attempt for user: {username}")
        return False, generic_error, None

    # Successful login
    logger.info(f"User logged in: {username}")
    return True, None, user.to_dict()
