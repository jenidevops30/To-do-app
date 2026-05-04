"""Unit tests for CSRF protection service.

Tests CSRF token generation, validation, and rotation.
Minimum 15 tests required for Phase 1.5.6.
"""

import pytest
import tempfile
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from database import TodoDatabase
from services.csrf_protection import (
    generate_csrf_token,
    hash_token,
    create_csrf_token,
    validate_csrf_token,
    rotate_csrf_token,
)
from services.session_manager import create_session
from services.auth_service import hash_password


@pytest.fixture
def db():
    """Create a temporary test database."""
    fd, db_path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    
    db = TodoDatabase(db_path)
    db.init_db()
    
    yield db
    
    # Cleanup
    try:
        os.unlink(db_path)
    except Exception:
        pass


@pytest.fixture
def test_user(db):
    """Create a test user."""
    user = db.create_user('testuser', hash_password('password123'))
    return user


@pytest.fixture
def test_session(db, test_user):
    """Create a test session."""
    success, _, result = create_session(db, test_user.id)
    assert success is True
    token, session = result
    return session


class TestCSRFTokenGeneration:
    """Test CSRF token generation."""

    def test_generate_csrf_token_returns_string(self):
        """Test that generate_csrf_token returns a string.
        
        **Validates: Requirements 11.4**
        """
        token = generate_csrf_token()
        assert isinstance(token, str)
        assert len(token) > 0

    def test_generate_csrf_token_is_url_safe(self):
        """Test that generated token is URL-safe.
        
        **Validates: Requirements 11.4**
        """
        token = generate_csrf_token()
        # URL-safe tokens should not contain special characters
        assert '+' not in token
        assert '/' not in token
        assert '=' not in token

    def test_generate_csrf_token_uniqueness(self):
        """Test that generated tokens are unique.
        
        **Validates: Requirements 11.4, 27**
        """
        tokens = set()
        for _ in range(100):
            token = generate_csrf_token()
            assert token not in tokens
            tokens.add(token)

    def test_generate_csrf_token_sufficient_length(self):
        """Test that generated tokens have sufficient entropy.
        
        **Validates: Requirements 11.4**
        """
        token = generate_csrf_token()
        # URL-safe base64 encoding of 32 bytes should be ~43 chars
        assert len(token) >= 40

    def test_hash_token_returns_string(self):
        """Test that hash_token returns a string.
        
        **Validates: Requirements 11.4**
        """
        token = generate_csrf_token()
        hashed = hash_token(token)
        assert isinstance(hashed, str)
        assert len(hashed) > 0

    def test_hash_token_is_deterministic(self):
        """Test that hash_token produces same hash for same token.
        
        **Validates: Requirements 11.4**
        """
        token = generate_csrf_token()
        hash1 = hash_token(token)
        hash2 = hash_token(token)
        assert hash1 == hash2

    def test_hash_token_different_for_different_tokens(self):
        """Test that different tokens produce different hashes.
        
        **Validates: Requirements 11.4**
        """
        token1 = generate_csrf_token()
        token2 = generate_csrf_token()
        hash1 = hash_token(token1)
        hash2 = hash_token(token2)
        assert hash1 != hash2


class TestCSRFTokenCreation:
    """Test CSRF token creation."""

    def test_create_csrf_token_success(self, db, test_session):
        """Test successful CSRF token creation.
        
        **Validates: Requirements 11.4**
        """
        success, error, result = create_csrf_token(db, test_session.id)
        assert success is True
        assert error is None
        assert result is not None
        token, csrf_token = result
        assert isinstance(token, str)
        assert csrf_token is not None
        assert csrf_token.session_id == test_session.id

    def test_create_csrf_token_plaintext_returned(self, db, test_session):
        """Test that returned token is plaintext (not hashed).
        
        **Validates: Requirements 11.4**
        """
        success, _, result = create_csrf_token(db, test_session.id)
        assert success is True
        token, csrf_token = result
        # Token should be different from stored hash
        assert token != csrf_token.token_hash

    def test_create_csrf_token_expiration_24_hours(self, db, test_session):
        """Test that CSRF token expires in 24 hours.
        
        **Validates: Requirements 11.4**
        """
        before = datetime.now()
        success, _, result = create_csrf_token(db, test_session.id)
        after = datetime.now()
        
        assert success is True
        token, csrf_token = result
        
        # Expiration should be approximately 24 hours from now
        expected_min = before + timedelta(hours=24)
        expected_max = after + timedelta(hours=24, minutes=1)
        
        assert expected_min <= csrf_token.expires_at <= expected_max

    def test_create_csrf_token_multiple_per_session(self, db, test_session):
        """Test creating multiple CSRF tokens for same session.
        
        **Validates: Requirements 11.4**
        """
        success1, _, result1 = create_csrf_token(db, test_session.id)
        success2, _, result2 = create_csrf_token(db, test_session.id)
        
        assert success1 is True
        assert success2 is True
        
        token1, csrf_token1 = result1
        token2, csrf_token2 = result2
        
        # Tokens should be different
        assert token1 != token2
        assert csrf_token1.id != csrf_token2.id


class TestCSRFTokenValidation:
    """Test CSRF token validation."""

    def test_validate_csrf_token_valid_token(self, db, test_session):
        """Test validating a valid CSRF token.
        
        **Validates: Requirements 11.1, 11.3**
        """
        success, _, result = create_csrf_token(db, test_session.id)
        token, _ = result
        
        is_valid, error = validate_csrf_token(db, test_session.id, token)
        assert is_valid is True
        assert error is None

    def test_validate_csrf_token_invalid_token(self, db, test_session):
        """Test validating an invalid token.
        
        **Validates: Requirements 11.1, 11.3**
        """
        is_valid, error = validate_csrf_token(
            db, test_session.id, 'invalid_token'
        )
        assert is_valid is False
        assert error is not None

    def test_validate_csrf_token_empty_token(self, db, test_session):
        """Test validating an empty token.
        
        **Validates: Requirements 11.1, 11.3**
        """
        is_valid, error = validate_csrf_token(db, test_session.id, '')
        assert is_valid is False
        assert error is not None

    def test_validate_csrf_token_none_token(self, db, test_session):
        """Test validating None token.
        
        **Validates: Requirements 11.1, 11.3**
        """
        is_valid, error = validate_csrf_token(db, test_session.id, None)
        assert is_valid is False
        assert error is not None

    def test_validate_csrf_token_wrong_session(self, db, test_user):
        """Test validating token with wrong session ID.
        
        **Validates: Requirements 11.1, 11.3**
        """
        # Create two sessions
        success1, _, result1 = create_session(db, test_user.id)
        success2, _, result2 = create_session(db, test_user.id)
        
        session1 = result1[1]
        session2 = result2[1]
        
        # Create CSRF token for session1
        success, _, result = create_csrf_token(db, session1.id)
        token, _ = result
        
        # Try to validate with session2
        is_valid, error = validate_csrf_token(db, session2.id, token)
        assert is_valid is False
        assert error is not None

    def test_validate_csrf_token_expired_token(self, db, test_session):
        """Test validating an expired CSRF token.
        
        **Validates: Requirements 11.1, 11.3**
        """
        success, _, result = create_csrf_token(db, test_session.id)
        token, csrf_token = result
        
        # Manually set expiration to past
        past_time = datetime.now() - timedelta(hours=1)
        db.update_csrf_token_expiration(csrf_token.id, past_time)
        
        is_valid, error = validate_csrf_token(db, test_session.id, token)
        assert is_valid is False
        assert error is not None

    def test_validate_csrf_token_non_string_token(self, db, test_session):
        """Test validating non-string token.
        
        **Validates: Requirements 11.1, 11.3**
        """
        is_valid, error = validate_csrf_token(db, test_session.id, 12345)
        assert is_valid is False
        assert error is not None


class TestCSRFTokenRotation:
    """Test CSRF token rotation."""

    def test_rotate_csrf_token_success(self, db, test_session):
        """Test successful CSRF token rotation.
        
        **Validates: Requirements 11.4**
        """
        # Create initial token
        success, _, result = create_csrf_token(db, test_session.id)
        old_token, _ = result
        
        # Rotate token
        success, error, new_result = rotate_csrf_token(
            db, test_session.id, old_token
        )
        assert success is True
        assert error is None
        assert new_result is not None
        
        new_token, new_csrf_token = new_result
        assert new_token != old_token
        assert new_csrf_token is not None

    def test_rotate_csrf_token_old_token_invalid(self, db, test_session):
        """Test that old token is invalid after rotation.
        
        **Validates: Requirements 11.4**
        """
        # Create initial token
        success, _, result = create_csrf_token(db, test_session.id)
        old_token, _ = result
        
        # Verify old token is valid
        is_valid, _ = validate_csrf_token(db, test_session.id, old_token)
        assert is_valid is True
        
        # Rotate token
        rotate_csrf_token(db, test_session.id, old_token)
        
        # Old token should now be invalid
        is_valid, _ = validate_csrf_token(db, test_session.id, old_token)
        assert is_valid is False

    def test_rotate_csrf_token_new_token_valid(self, db, test_session):
        """Test that new token is valid after rotation.
        
        **Validates: Requirements 11.4**
        """
        # Create initial token
        success, _, result = create_csrf_token(db, test_session.id)
        old_token, _ = result
        
        # Rotate token
        success, _, new_result = rotate_csrf_token(
            db, test_session.id, old_token
        )
        new_token, _ = new_result
        
        # New token should be valid
        is_valid, _ = validate_csrf_token(db, test_session.id, new_token)
        assert is_valid is True

    def test_rotate_csrf_token_invalid_old_token(self, db, test_session):
        """Test rotating with invalid old token.
        
        **Validates: Requirements 11.4**
        """
        success, error, result = rotate_csrf_token(
            db, test_session.id, 'invalid_token'
        )
        assert success is False
        assert error is not None
        assert result is None

    def test_rotate_csrf_token_multiple_rotations(self, db, test_session):
        """Test multiple consecutive token rotations.
        
        **Validates: Requirements 11.4**
        """
        # Create initial token
        success, _, result = create_csrf_token(db, test_session.id)
        token, _ = result
        
        # Rotate multiple times
        for i in range(5):
            success, _, new_result = rotate_csrf_token(
                db, test_session.id, token
            )
            assert success is True
            token, _ = new_result
            
            # Verify new token is valid
            is_valid, _ = validate_csrf_token(db, test_session.id, token)
            assert is_valid is True


class TestCSRFTokenPerSession:
    """Test CSRF token per-session property."""

    def test_csrf_tokens_unique_per_session(self, db, test_user):
        """Test that CSRF tokens are unique per session.
        
        **Validates: Requirements 11.4, 27**
        """
        # Create two sessions
        success1, _, result1 = create_session(db, test_user.id)
        success2, _, result2 = create_session(db, test_user.id)
        
        session1 = result1[1]
        session2 = result2[1]
        
        # Create CSRF tokens for each session
        success1, _, result1 = create_csrf_token(db, session1.id)
        success2, _, result2 = create_csrf_token(db, session2.id)
        
        token1, _ = result1
        token2, _ = result2
        
        # Tokens should be different
        assert token1 != token2
        
        # Token1 should only be valid for session1
        is_valid1, _ = validate_csrf_token(db, session1.id, token1)
        is_valid2, _ = validate_csrf_token(db, session2.id, token1)
        
        assert is_valid1 is True
        assert is_valid2 is False


class TestCSRFIntegration:
    """Integration tests for CSRF protection."""

    def test_complete_csrf_lifecycle(self, db, test_session):
        """Test complete CSRF lifecycle: create → validate → rotate.
        
        **Validates: Requirements 11.1, 11.3, 11.4**
        """
        # Create token
        success, _, result = create_csrf_token(db, test_session.id)
        assert success is True
        token, csrf_token = result
        
        # Validate token
        is_valid, _ = validate_csrf_token(db, test_session.id, token)
        assert is_valid is True
        
        # Rotate token
        success, _, new_result = rotate_csrf_token(
            db, test_session.id, token
        )
        assert success is True
        new_token, _ = new_result
        
        # Old token should be invalid
        is_valid, _ = validate_csrf_token(db, test_session.id, token)
        assert is_valid is False
        
        # New token should be valid
        is_valid, _ = validate_csrf_token(db, test_session.id, new_token)
        assert is_valid is True
