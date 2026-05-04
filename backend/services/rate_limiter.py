"""Rate limiting service for protecting against brute force attacks.

This module provides IP-based rate limiting for authentication endpoints.
Tracks failed login attempts and temporarily blocks IPs that exceed
configured thresholds.
"""

import logging
from typing import Optional, Tuple
from datetime import datetime, timedelta
from models import RateLimitAttempt


logger = logging.getLogger(__name__)

# Rate limiting configuration
RATE_LIMIT_15MIN_THRESHOLD = 5  # 5 attempts in 15 minutes
RATE_LIMIT_1HOUR_THRESHOLD = 10  # 10 attempts in 1 hour
RATE_LIMIT_15MIN_WINDOW = 15  # minutes
RATE_LIMIT_1HOUR_WINDOW = 60  # minutes
RATE_LIMIT_BLOCK_DURATION = 60  # minutes


def track_attempt(
    db,
    ip_address: str,
    endpoint: str
) -> Tuple[bool, Optional[str]]:
    """Track a failed login attempt for an IP address.

    Records the attempt in the database and checks if the IP should
    be blocked based on rate limiting thresholds.

    Args:
        db: TodoDatabase instance for database operations
        ip_address: IP address making the request
        endpoint: API endpoint being accessed (e.g., '/api/auth/login')

    Returns:
        Tuple of (should_allow, error_message)
        - should_allow: True if request should be allowed, False if blocked
        - error_message: None if allowed, error message if blocked

    **Validates: Requirements 12.1, 12.2**
    """
    try:
        now = datetime.now()

        # Get or create rate limit record
        attempt = db.get_rate_limit_attempt(ip_address, endpoint)

        if attempt is None:
            # First attempt from this IP/endpoint
            db.create_rate_limit_attempt(ip_address, endpoint, now)
            logger.info(f"Rate limit tracking started for {ip_address} on {endpoint}")
            return True, None

        # Check if IP is currently blocked
        if attempt.blocked_until and now < attempt.blocked_until:
            logger.warning(
                f"Rate limit block active for {ip_address} until "
                f"{attempt.blocked_until}"
            )
            return False, "Too many requests. Please try again later."

        # Reset block if it has expired
        if attempt.blocked_until and now >= attempt.blocked_until:
            db.update_rate_limit_attempt(
                ip_address,
                endpoint,
                attempt_count=1,
                blocked_until=None
            )
            logger.info(f"Rate limit block expired for {ip_address}")
            return True, None

        # Check 15-minute window
        time_15min_ago = now - timedelta(minutes=RATE_LIMIT_15MIN_WINDOW)
        if attempt.first_attempt_at > time_15min_ago:
            # Still within 15-minute window
            if attempt.attempt_count >= RATE_LIMIT_15MIN_THRESHOLD:
                # Block for 1 hour
                block_until = now + timedelta(
                    minutes=RATE_LIMIT_BLOCK_DURATION
                )
                db.update_rate_limit_attempt(
                    ip_address,
                    endpoint,
                    attempt_count=attempt.attempt_count + 1,
                    blocked_until=block_until
                )
                logger.warning(
                    f"Rate limit triggered (15-min threshold) for {ip_address} "
                    f"on {endpoint}"
                )
                return False, "Too many requests. Please try again later."

        # Check 1-hour window
        time_1hour_ago = now - timedelta(minutes=RATE_LIMIT_1HOUR_WINDOW)
        if attempt.first_attempt_at > time_1hour_ago:
            # Still within 1-hour window
            if attempt.attempt_count >= RATE_LIMIT_1HOUR_THRESHOLD:
                # Block for 1 hour
                block_until = now + timedelta(
                    minutes=RATE_LIMIT_BLOCK_DURATION
                )
                db.update_rate_limit_attempt(
                    ip_address,
                    endpoint,
                    attempt_count=attempt.attempt_count + 1,
                    blocked_until=block_until
                )
                logger.warning(
                    f"Rate limit triggered (1-hour threshold) for {ip_address} "
                    f"on {endpoint}"
                )
                return False, "Too many requests. Please try again later."

        # Increment attempt count
        db.update_rate_limit_attempt(
            ip_address,
            endpoint,
            attempt_count=attempt.attempt_count + 1
        )
        logger.debug(
            f"Rate limit attempt recorded for {ip_address} on {endpoint} "
            f"(count: {attempt.attempt_count + 1})"
        )
        return True, None

    except Exception as e:
        logger.error(f"Rate limiting error: {str(e)}")
        # Allow request on error to avoid blocking legitimate traffic
        return True, None


def check_rate_limit(
    db,
    ip_address: str,
    endpoint: str
) -> Tuple[bool, Optional[str]]:
    """Check if an IP address is currently rate limited.

    Checks if the IP has exceeded rate limiting thresholds without
    recording a new attempt.

    Args:
        db: TodoDatabase instance for database operations
        ip_address: IP address to check
        endpoint: API endpoint being accessed

    Returns:
        Tuple of (is_allowed, error_message)
        - is_allowed: True if request should be allowed, False if blocked
        - error_message: None if allowed, error message if blocked

    **Validates: Requirements 12.1, 12.2**
    """
    try:
        now = datetime.now()
        attempt = db.get_rate_limit_attempt(ip_address, endpoint)

        if attempt is None:
            # No record means not blocked
            return True, None

        # Check if currently blocked
        if attempt.blocked_until and now < attempt.blocked_until:
            logger.debug(f"Rate limit check: {ip_address} is blocked")
            return False, "Too many requests. Please try again later."

        # Check 15-minute threshold
        time_15min_ago = now - timedelta(minutes=RATE_LIMIT_15MIN_WINDOW)
        if (attempt.first_attempt_at > time_15min_ago and
                attempt.attempt_count >= RATE_LIMIT_15MIN_THRESHOLD):
            logger.debug(
                f"Rate limit check: {ip_address} exceeded 15-min threshold"
            )
            return False, "Too many requests. Please try again later."

        # Check 1-hour threshold
        time_1hour_ago = now - timedelta(minutes=RATE_LIMIT_1HOUR_WINDOW)
        if (attempt.first_attempt_at > time_1hour_ago and
                attempt.attempt_count >= RATE_LIMIT_1HOUR_THRESHOLD):
            logger.debug(
                f"Rate limit check: {ip_address} exceeded 1-hour threshold"
            )
            return False, "Too many requests. Please try again later."

        return True, None

    except Exception as e:
        logger.error(f"Rate limit check error: {str(e)}")
        # Allow request on error
        return True, None


def block_ip(
    db,
    ip_address: str,
    endpoint: str,
    duration_minutes: int = RATE_LIMIT_BLOCK_DURATION
) -> Tuple[bool, Optional[str]]:
    """Manually block an IP address for a specified duration.

    Args:
        db: TodoDatabase instance for database operations
        ip_address: IP address to block
        endpoint: API endpoint to block for
        duration_minutes: How long to block (default: 60 minutes)

    Returns:
        Tuple of (success, error_message)
        - success: True if IP was blocked, False otherwise
        - error_message: None if successful, error message if failed
    """
    try:
        now = datetime.now()
        block_until = now + timedelta(minutes=duration_minutes)

        attempt = db.get_rate_limit_attempt(ip_address, endpoint)
        if attempt is None:
            db.create_rate_limit_attempt(ip_address, endpoint, now)
            attempt = db.get_rate_limit_attempt(ip_address, endpoint)

        db.update_rate_limit_attempt(
            ip_address,
            endpoint,
            blocked_until=block_until
        )

        logger.info(
            f"IP blocked: {ip_address} on {endpoint} until {block_until}"
        )
        return True, None

    except Exception as e:
        logger.error(f"Failed to block IP: {str(e)}")
        return False, "Failed to block IP"


def unblock_ip(
    db,
    ip_address: str,
    endpoint: str
) -> Tuple[bool, Optional[str]]:
    """Manually unblock an IP address.

    Args:
        db: TodoDatabase instance for database operations
        ip_address: IP address to unblock
        endpoint: API endpoint to unblock for

    Returns:
        Tuple of (success, error_message)
        - success: True if IP was unblocked, False otherwise
        - error_message: None if successful, error message if failed
    """
    try:
        attempt = db.get_rate_limit_attempt(ip_address, endpoint)
        if attempt is None:
            return False, "No rate limit record found"

        db.update_rate_limit_attempt(
            ip_address,
            endpoint,
            blocked_until=None
        )

        logger.info(f"IP unblocked: {ip_address} on {endpoint}")
        return True, None

    except Exception as e:
        logger.error(f"Failed to unblock IP: {str(e)}")
        return False, "Failed to unblock IP"
