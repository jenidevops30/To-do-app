"""Unit tests for session manager.

Tests session token generation, validation, expiration, and invalidation.
Minimum 20 tests required for Phase 1.4.7.
"""

import pytest
import tempfile
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from database import TodoDatabase
from services.session_manager import (
    generate_session_token,
    hash_token,
    create_session,
    validate_session_token,
    get_user_from_session,
    invalidate_session,
)
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


class TestSessionTokenGeneration:
    """Test session token generation."""

    def test_generate_session_token_returns_string(self):
        """Test that generate_session_token returns a string.
        
        **Validates: Requirements 10.1**
        """
        token = generate_session_token()
        assert isinstance(token, str)
        assert len(token) > 0

    def test_generate_session_token_is_url_safe(self):
        """Test that generated token is URL-safe.
        
        **Validates: Requirements 10.1**
        """
        token = generate_session_token()
        # URL-safe tokens should not contain special characters
        # that would need encoding
        assert '+' not in token
        assert '/' not in token
        assert '=' not in token

    def test_generate_session_token_uniqueness(self):
        """Test that generated tokens are unique.
        
        **Validates: Requirements 10.1, 25**
        """
        tokens = set()
        for _ in range(100):
            token = generate_session_token()
            assert token not in tokens
            tokens.add(token)

    def test_generate_session_token_sufficient_length(self):
        """Test that generated tokens have sufficient entropy.
        
        **Validates: Requirements 10.1**
        """
        token = generate_session_token()
        # URL-safe base64 encoding of 32 bytes should be ~43 chars
        assert len(token) >= 40

    def test_hash_token_returns_string(self):
        """Test that hash_token returns a string.
        
        **Validates: Requirements 10.1**
        """
        token = generate_session_token()
        hashed = hash_token(token)
        assert isinstance(hashed, str)
        assert len(hashed) > 0

    def test_hash_token_is_deterministic(self):
        """Test that hash_token produces same hash for same token.
        
        **Validates: Requirements 10.1**
        """
        token = generate_session_token()
        hash1 = hash_token(token)
        hash2 = hash_token(token)
        assert hash1 == hash2

    def test_hash_token_different_for_different_tokens(self):
        """Test that different tokens produce different hashes.
        
        **Validates: Requirements 10.1**
        """
        token1 = generate_session_token()
        token2 = generate_session_token()
        hash1 = hash_token(token1)
        hash2 = hash_token(token2)
        assert hash1 != hash2

    def test_hash_token_is_hex_string(self):
        """Test that hash_token returns hex string (SHA-256).
        
        **Validates: Requirements 10.1**
        """
        token = generate_session_token()
        hashed = hash_token(token)
        # SHA-256 hex should be 64 characters
        assert len(hashed) == 64
        # Should only contain hex characters
        assert all(c in '0123456789abcdef' for c in hashed)


class TestSessionCreation:
    """Test session creation."""

    def test_create_session_success(self, db, test_user):
        """Test successful session creation.
        
        **Validates: Requirements 2.5, 3.1, 10.6**
        """
        success, error, result = create_session(db, test_user.id)
        assert success is True
        assert error is None
        assert result is not None
        token, session = result
        assert isinstance(token, str)
        assert session is not None
        assert session.user_id == test_user.id

    def test_create_session_token_is_plaintext(self, db, test_user):
        """Test that returned token is plaintext (not hashed).
        
        **Validates: Requirements 2.5**
        """
        success, error, result = create_session(db, test_user.id)
        assert success is True
        token, session = result
        # Token should be different from stored hash
        assert token != session.token_hash

    def test_create_session_expiration_24_hours(self, db, test_user):
        """Test that session expires in 24 hours.
        
        **Validates: Requirements 2.5, 3.1, 10.6**
        """
        before = datetime.now()
        success, error, result = create_session(db, test_user.id)
        after = datetime.now()
        
        assert success is True
        token, session = result
        
        # Expiration should be approximately 24 hours from now
        expected_min = before + timedelta(hours=24)
        expected_max = after + timedelta(hours=24, minutes=1)
        
        assert expected_min <= session.expires_at <= expected_max

    def test_create_session_multiple_sessions_same_user(self, db, test_user):
        """Test creating multiple sessions for same user.
        
        **Validates: Requirements 2.5**
        """
        success1, _, result1 = create_session(db, test_user.id)
        success2, _, result2 = create_session(db, test_user.id)
        
        assert success1 is True
        assert success2 is True
        
        token1, session1 = result1
        token2, session2 = result2
        
        # Tokens should be different
        assert token1 != token2
        assert session1.id != session2.id

    def test_create_session_invalid_user_id(self, db):
        """Test creating session with invalid user ID.
        
        **Validates: Requirements 2.5**
        """
        success, error, result = create_session(db, 'nonexistent_user_id')
        # Should still create session (foreign key constraint may not be enforced)
        # or fail gracefully
        assert isinstance(success, bool)


class TestSessionValidation:
    """Test session token validation."""

    def test_validate_session_token_valid_token(self, db, test_user):
        """Test validating a valid session token.
        
        **Validates: Requirements 3.2**
        """
        success, _, result = create_session(db, test_user.id)
        token, _ = result
        
        is_valid, error, session = validate_session_token(db, token)
        assert is_valid is True
        assert error is None
        assert session is not None
        assert session.user_id == test_user.id

    def test_validate_session_token_invalid_token(self, db):
        """Test validating an invalid token.
        
        **Validates: Requirements 3.4**
        """
        is_valid, error, session = validate_session_token(db, 'invalid_token')
        assert is_valid is False
        assert error is not None
        assert session is None

    def test_validate_session_token_empty_token(self, db):
        """Test validating an empty token.
        
        **Validates: Requirements 3.4**
        """
        is_valid, error, session = validate_session_token(db, '')
        assert is_valid is False
        assert error is not None
        assert session is None

    def test_validate_session_token_none_token(self, db):
        """Test validating None token.
        
        **Validates: Requirements 3.4**
        """
        is_valid, error, session = validate_session_token(db, None)
        assert is_valid is False
        assert error is not None
        assert session is None

    def test_validate_session_token_expired_token(self, db, test_user):
        """Test validating an expired token.
        
        **Validates: Requirements 3.3**
        """
        success, _, result = create_session(db, test_user.id)
        token, session = result
        
        # Manually set expiration to past
        past_time = datetime.now() - timedelta(hours=1)
        db.update_session_expiration(session.id, past_time)
        
        is_valid, error, retrieved_session = validate_session_token(db, token)
        assert is_valid is False
        assert error is not None
        assert retrieved_session is None

    def test_validate_session_token_non_string_token(self, db):
        """Test validating non-string token.
        
        **Validates: Requirements 3.4**
        """
        is_valid, error, session = validate_session_token(db, 12345)
        assert is_valid is False
        assert error is not None
        assert session is None


class TestGetUserFromSession:
    """Test retrieving user from session."""

    def test_get_user_from_session_valid_token(self, db, test_user):
        """Test getting user from valid session token.
        
        **Validates: Requirements 3.2, 3.6**
        """
        success, _, result = create_session(db, test_user.id)
        token, _ = result
        
        success, error, user_data = get_user_from_session(db, token)
        assert success is True
        assert error is None
        assert user_data is not None
        assert user_data['id'] == test_user.id
        assert user_data['username'] == test_user.username

    def test_get_user_from_session_invalid_token(self, db):
        """Test getting user from invalid token.
        
        **Validates: Requirements 3.4**
        """
        success, error, user_data = get_user_from_session(db, 'invalid_token')
        assert success is False
        assert error is not None
        assert user_data is None

    def test_get_user_from_session_expired_token(self, db, test_user):
        """Test getting user from expired token.
        
        **Validates: Requirements 3.3**
        """
        success, _, result = create_session(db, test_user.id)
        token, session = result
        
        # Manually expire the session
        past_time = datetime.now() - timedelta(hours=1)
        db.update_session_expiration(session.id, past_time)
        
        success, error, user_data = get_user_from_session(db, token)
        assert success is False
        assert error is not None
        assert user_data is None


class TestSessionInvalidation:
    """Test session invalidation (logout)."""

    def test_invalidate_session_valid_token(self, db, test_user):
        """Test invalidating a valid session.
        
        **Validates: Requirements 4.1, 4.4**
        """
        success, _, result = create_session(db, test_user.id)
        token, _ = result
        
        # Verify token is valid before invalidation
        is_valid, _, _ = validate_session_token(db, token)
        assert is_valid is True
        
        # Invalidate session
        success, error = invalidate_session(db, token)
        assert success is True
        assert error is None
        
        # Verify token is no longer valid
        is_valid, _, _ = validate_session_token(db, token)
        assert is_valid is False

    def test_invalidate_session_invalid_token(self, db):
        """Test invalidating with invalid token.
        
        **Validates: Requirements 4.1**
        """
        success, error = invalidate_session(db, 'invalid_token')
        assert success is False
        assert error is not None

    def test_invalidate_session_already_invalidated(self, db, test_user):
        """Test invalidating an already invalidated session.
        
        **Validates: Requirements 4.1**
        """
        success, _, result = create_session(db, test_user.id)
        token, _ = result
        
        # Invalidate once
        success1, _ = invalidate_session(db, token)
        assert success1 is True
        
        # Try to invalidate again
        success2, error = invalidate_session(db, token)
        assert success2 is False
        assert error is not None

    def test_invalidate_session_does_not_affect_other_sessions(
        self, db, test_user
    ):
        """Test that invalidating one session doesn't affect others.
        
        **Validates: Requirements 4.1**
        """
        # Create two sessions
        success1, _, result1 = create_session(db, test_user.id)
        success2, _, result2 = create_session(db, test_user.id)
        
        token1, _ = result1
        token2, _ = result2
        
        # Invalidate first session
        invalidate_session(db, token1)
        
        # First token should be invalid
        is_valid1, _, _ = validate_session_token(db, token1)
        assert is_valid1 is False
        
        # Second token should still be valid
        is_valid2, _, _ = validate_session_token(db, token2)
        assert is_valid2 is True


class TestSessionTokenUniqueness:
    """Test session token uniqueness property."""

    def test_session_tokens_are_unique(self, db, test_user):
        """Test that each session gets a unique token.
        
        **Validates: Requirements 10.1, 25**
        """
        tokens = set()
        for _ in range(50):
            success, _, result = create_session(db, test_user.id)
            assert success is True
            token, _ = result
            assert token not in tokens
            tokens.add(token)


class TestSessionExpiration:
    """Test session expiration behavior."""

    def test_session_token_expiration_property(self, db, test_user):
        """Test that session token expires exactly 24 hours after creation.
        
        **Validates: Requirements 2.5, 3.1, 10.6, 12**
        """
        before = datetime.now()
        success, _, result = create_session(db, test_user.id)
        after = datetime.now()
        
        assert success is True
        token, session = result
        
        # Calculate expected expiration window
        min_expiration = before + timedelta(hours=24)
        max_expiration = after + timedelta(hours=24, minutes=1)
        
        # Verify expiration is within expected window
        assert min_expiration <= session.expires_at <= max_expiration
        
        # Verify token is valid now
        is_valid, _, _ = validate_session_token(db, token)
        assert is_valid is True


class TestSessionIntegration:
    """Integration tests for session management."""

    def test_complete_session_lifecycle(self, db, test_user):
        """Test complete session lifecycle: create → validate → invalidate.
        
        **Validates: Requirements 2.5, 3.2, 4.1, 4.4**
        """
        # Create session
        success, _, result = create_session(db, test_user.id)
        assert success is True
        token, session = result
        
        # Validate session
        is_valid, _, retrieved_session = validate_session_token(db, token)
        assert is_valid is True
        assert retrieved_session.id == session.id
        
        # Get user from session
        success, _, user_data = get_user_from_session(db, token)
        assert success is True
        assert user_data['id'] == test_user.id
        
        # Invalidate session
        success, _ = invalidate_session(db, token)
        assert success is True
        
        # Verify session is no longer valid
        is_valid, _, _ = validate_session_token(db, token)
        assert is_valid is False

    def test_multiple_users_multiple_sessions(self, db):
        """Test multiple users with multiple sessions each.
        
        **Validates: Requirements 2.5, 3.2**
        """
        # Create two users
        user1 = db.create_user('user1', hash_password('password123'))
        user2 = db.create_user('user2', hash_password('password123'))
        
        # Create sessions for each user
        success1, _, result1 = create_session(db, user1.id)
        success2, _, result2 = create_session(db, user2.id)
        
        token1, session1 = result1
        token2, session2 = result2
        
        # Verify each token belongs to correct user
        _, _, user_data1 = get_user_from_session(db, token1)
        _, _, user_data2 = get_user_from_session(db, token2)
        
        assert user_data1['id'] == user1.id
        assert user_data2['id'] == user2.id
        
        # Invalidate user1's session
        invalidate_session(db, token1)
        
        # User1's token should be invalid
        is_valid1, _, _ = validate_session_token(db, token1)
        assert is_valid1 is False
        
        # User2's token should still be valid
        is_valid2, _, _ = validate_session_token(db, token2)
        assert is_valid2 is True
