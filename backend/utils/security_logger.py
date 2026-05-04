"""
Security logging module for authentication and authorization events.

This module provides centralized security logging for:
- Failed login attempts with IP address
- Rate limit triggers
- CSRF failures
- Unauthorized access attempts

All logs exclude sensitive data (passwords, tokens, etc.).

Validates: Requirements 12.3, 14.5, 9.2
"""

import logging
from datetime import datetime


def get_security_logger():
    """Get or create the security logger.
    
    Returns:
        logging.Logger: Security logger instance
    """
    return logging.getLogger('security')


def log_failed_login(ip_address, username=None):
    """Log a failed login attempt.
    
    Args:
        ip_address (str): IP address of the failed attempt
        username (str, optional): Username attempted (if available)
        
    Validates: Requirements 12.3
    """
    logger = get_security_logger()
    if username:
        logger.warning(
            f"Failed login attempt - IP: {ip_address}, Username: {username}"
        )
    else:
        logger.warning(f"Failed login attempt - IP: {ip_address}")


def log_rate_limit_trigger(ip_address, endpoint, attempt_count):
    """Log when rate limiting is triggered.
    
    Args:
        ip_address (str): IP address that triggered rate limit
        endpoint (str): API endpoint being rate limited
        attempt_count (int): Number of attempts made
        
    Validates: Requirements 12.3
    """
    logger = get_security_logger()
    logger.warning(
        f"Rate limit triggered - IP: {ip_address}, "
        f"Endpoint: {endpoint}, Attempts: {attempt_count}"
    )


def log_csrf_failure(ip_address, endpoint, reason=None):
    """Log a CSRF token validation failure.
    
    Args:
        ip_address (str): IP address of the request
        endpoint (str): API endpoint that failed CSRF validation
        reason (str, optional): Reason for failure (missing, invalid, expired)
        
    Validates: Requirements 11.1
    """
    logger = get_security_logger()
    if reason:
        logger.warning(
            f"CSRF validation failed - IP: {ip_address}, "
            f"Endpoint: {endpoint}, Reason: {reason}"
        )
    else:
        logger.warning(
            f"CSRF validation failed - IP: {ip_address}, "
            f"Endpoint: {endpoint}"
        )


def log_unauthorized_access(ip_address, endpoint, user_id=None, reason=None):
    """Log an unauthorized access attempt.
    
    Args:
        ip_address (str): IP address of the request
        endpoint (str): API endpoint being accessed
        user_id (str, optional): User ID if authenticated
        reason (str, optional): Reason for denial (not authenticated, forbidden)
        
    Validates: Requirements 14.5
    """
    logger = get_security_logger()
    if user_id:
        logger.warning(
            f"Unauthorized access attempt - IP: {ip_address}, "
            f"Endpoint: {endpoint}, User: {user_id}, Reason: {reason}"
        )
    else:
        logger.warning(
            f"Unauthorized access attempt - IP: {ip_address}, "
            f"Endpoint: {endpoint}, Reason: {reason}"
        )


def log_successful_login(ip_address, username):
    """Log a successful login.
    
    Args:
        ip_address (str): IP address of the successful login
        username (str): Username that logged in
        
    Validates: Requirements 12.3
    """
    logger = get_security_logger()
    logger.info(f"Successful login - IP: {ip_address}, Username: {username}")


def log_logout(ip_address, username):
    """Log a user logout.
    
    Args:
        ip_address (str): IP address of the logout
        username (str): Username that logged out
        
    Validates: Requirements 12.3
    """
    logger = get_security_logger()
    logger.info(f"User logout - IP: {ip_address}, Username: {username}")


def log_signup_attempt(ip_address, username, success=True):
    """Log a signup attempt.
    
    Args:
        ip_address (str): IP address of the signup attempt
        username (str): Username being registered
        success (bool): Whether signup was successful
        
    Validates: Requirements 12.3
    """
    logger = get_security_logger()
    status = "successful" if success else "failed"
    logger.info(
        f"Signup {status} - IP: {ip_address}, Username: {username}"
    )


def log_password_validation_failure(ip_address, reason):
    """Log a password validation failure during signup.
    
    Args:
        ip_address (str): IP address of the signup attempt
        reason (str): Reason for validation failure
        
    Validates: Requirements 12.3
    """
    logger = get_security_logger()
    logger.warning(
        f"Password validation failed - IP: {ip_address}, Reason: {reason}"
    )


def log_username_validation_failure(ip_address, reason):
    """Log a username validation failure during signup.
    
    Args:
        ip_address (str): IP address of the signup attempt
        reason (str): Reason for validation failure
        
    Validates: Requirements 12.3
    """
    logger = get_security_logger()
    logger.warning(
        f"Username validation failed - IP: {ip_address}, Reason: {reason}"
    )


def log_duplicate_username(ip_address, username):
    """Log a duplicate username signup attempt.
    
    Args:
        ip_address (str): IP address of the signup attempt
        username (str): Username that already exists
        
    Validates: Requirements 12.3
    """
    logger = get_security_logger()
    logger.warning(
        f"Duplicate username signup attempt - IP: {ip_address}, "
        f"Username: {username}"
    )


def log_session_expiration(user_id):
    """Log a session expiration.
    
    Args:
        user_id (str): User ID whose session expired
        
    Validates: Requirements 12.3
    """
    logger = get_security_logger()
    logger.info(f"Session expired - User: {user_id}")


def log_invalid_session_token(ip_address, reason=None):
    """Log an invalid session token attempt.
    
    Args:
        ip_address (str): IP address of the request
        reason (str, optional): Reason for invalidity (expired, tampered, etc.)
        
    Validates: Requirements 12.3
    """
    logger = get_security_logger()
    if reason:
        logger.warning(
            f"Invalid session token - IP: {ip_address}, Reason: {reason}"
        )
    else:
        logger.warning(f"Invalid session token - IP: {ip_address}")


def log_todo_access_denied(ip_address, user_id, todo_id, action):
    """Log a denied todo access attempt.
    
    Args:
        ip_address (str): IP address of the request
        user_id (str): User ID attempting access
        todo_id (str): Todo ID being accessed
        action (str): Action attempted (read, update, delete)
        
    Validates: Requirements 14.5
    """
    logger = get_security_logger()
    logger.warning(
        f"Todo access denied - IP: {ip_address}, User: {user_id}, "
        f"Todo: {todo_id}, Action: {action}"
    )


def configure_security_logging(app):
    """Configure security logging for the Flask application.
    
    Args:
        app (Flask): Flask application instance
        
    Validates: Requirements 12.3, 14.5, 9.2
    """
    security_logger = get_security_logger()
    
    # Create a file handler for security logs
    # In production, this should be configured to write to a secure location
    security_handler = logging.FileHandler('security.log')
    security_handler.setLevel(logging.WARNING)
    
    # Create a formatter that includes timestamp and level
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    security_handler.setFormatter(formatter)
    
    # Add the handler to the security logger
    security_logger.addHandler(security_handler)
    
    # Also log to console in development
    if app.config.get('DEBUG'):
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.WARNING)
        console_handler.setFormatter(formatter)
        security_logger.addHandler(console_handler)
    
    app.logger.info("Security logging configured")
