"""Unit tests for authentication service.

These tests verify specific examples and edge cases for password hashing,
password verification, username validation, password validation, user
registration, and user login.

**Validates: Requirements 1.1-1.8, 2.1-2.4, 9.1, 9.5**
"""

import pytest
import tempfile
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.auth_service import (
    hash_password,
    verify_password,
    validate_username,
    validate_password,
    signup,
    login,
)
from database import TodoDatabase


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


class TestPasswordHashing:
    """Test password hashing with bcrypt."""

    def test_hash_password_returns_string(self):
        """Test that hash_password returns a string."""
        password = "TestPassword123"
        hash_result = hash_password(password)
        assert isinstance(hash_result, str)

    def test_hash_password_not_equal_to_plaintext(self):
        """Test that hash is not equal to plaintext password.
        
        **Validates: Requirements 1.7, 1.8, 9.1**
        """
        password = "TestPassword123"
        hash_result = hash_password(password)
        assert hash_result != password

    def test_hash_password_different_hashes_for_same_password(self):
        """Test that same password produces different hashes (due to salt)."""
        password = "TestPassword123"
        hash1 = hash_password(password)
        hash2 = hash_password(password)
        # Different hashes due to different salts
        assert hash1 != hash2

    def test_hash_password_with_special_characters(self):
        """Test hashing password with special characters."""
        password = "P@ssw0rd!#$%^&*()"
        hash_result = hash_password(password)
        assert isinstance(hash_result, str)
        assert hash_result != password

    def test_hash_password_with_unicode(self):
        """Test hashing password with unicode characters."""
        password = "Pässwörd123"
        hash_result = hash_password(password)
        assert isinstance(hash_result, str)
        assert hash_result != password

    def test_hash_password_minimum_length(self):
        """Test hashing password at minimum length (8 chars)."""
        password = "Pass1234"
        hash_result = hash_password(password)
        assert isinstance(hash_result, str)

    def test_hash_password_maximum_length(self):
        """Test hashing password at maximum length (128 chars)."""
        password = "a" * 100 + "1234567890" + "B" * 17
        hash_result = hash_password(password)
        assert isinstance(hash_result, str)

    def test_hash_password_too_short_raises_error(self):
        """Test that password too short raises ValueError."""
        password = "Pass123"  # 7 chars, less than 8
        with pytest.raises(ValueError):
            hash_password(password)

    def test_hash_password_too_long_raises_error(self):
        """Test that password too long raises ValueError."""
        password = "a" * 129  # More than 128 chars
        with pytest.raises(ValueError):
            hash_password(password)

    def test_hash_password_non_string_raises_error(self):
        """Test that non-string password raises TypeError."""
        with pytest.raises(TypeError):
            hash_password(123)

    def test_hash_password_none_raises_error(self):
        """Test that None password raises TypeError."""
        with pytest.raises(TypeError):
            hash_password(None)


class TestPasswordVerification:
    """Test password verification with bcrypt."""

    def test_verify_password_correct_password(self):
        """Test that correct password verifies successfully.
        
        **Validates: Requirements 9.5**
        """
        password = "TestPassword123"
        hash_result = hash_password(password)
        assert verify_password(password, hash_result) is True

    def test_verify_password_incorrect_password(self):
        """Test that incorrect password fails verification."""
        password = "TestPassword123"
        wrong_password = "WrongPassword456"
        hash_result = hash_password(password)
        assert verify_password(wrong_password, hash_result) is False

    def test_verify_password_case_sensitive(self):
        """Test that password verification is case-sensitive."""
        password = "TestPassword123"
        hash_result = hash_password(password)
        assert verify_password("testpassword123", hash_result) is False

    def test_verify_password_with_special_characters(self):
        """Test verification of password with special characters."""
        password = "P@ssw0rd!#$%^&*()"
        hash_result = hash_password(password)
        assert verify_password(password, hash_result) is True
        assert verify_password("P@ssw0rd!#$%^&*(", hash_result) is False

    def test_verify_password_with_unicode(self):
        """Test verification of password with unicode characters."""
        password = "Pässwörd123"
        hash_result = hash_password(password)
        assert verify_password(password, hash_result) is True
        assert verify_password("Passwörd123", hash_result) is False

    def test_verify_password_invalid_hash_returns_false(self):
        """Test that invalid hash returns False without raising."""
        password = "TestPassword123"
        invalid_hash = "not_a_valid_hash"
        assert verify_password(password, invalid_hash) is False

    def test_verify_password_non_string_password_returns_false(self):
        """Test that non-string password returns False."""
        hash_result = hash_password("TestPassword123")
        assert verify_password(123, hash_result) is False

    def test_verify_password_non_string_hash_returns_false(self):
        """Test that non-string hash returns False."""
        assert verify_password("TestPassword123", 123) is False

    def test_verify_password_none_password_returns_false(self):
        """Test that None password returns False."""
        hash_result = hash_password("TestPassword123")
        assert verify_password(None, hash_result) is False

    def test_verify_password_none_hash_returns_false(self):
        """Test that None hash returns False."""
        assert verify_password("TestPassword123", None) is False


class TestUsernameValidation:
    """Test username validation."""

    def test_validate_username_valid_simple(self):
        """Test validation of simple valid username."""
        is_valid, error = validate_username("john")
        assert is_valid is True
        assert error is None

    def test_validate_username_valid_with_underscore(self):
        """Test validation of username with underscore."""
        is_valid, error = validate_username("john_doe")
        assert is_valid is True
        assert error is None

    def test_validate_username_valid_with_numbers(self):
        """Test validation of username with numbers."""
        is_valid, error = validate_username("user123")
        assert is_valid is True
        assert error is None

    def test_validate_username_valid_minimum_length(self):
        """Test validation of username at minimum length (3 chars).
        
        **Validates: Requirements 1.5**
        """
        is_valid, error = validate_username("abc")
        assert is_valid is True
        assert error is None

    def test_validate_username_valid_maximum_length(self):
        """Test validation of username at maximum length (50 chars).
        
        **Validates: Requirements 1.6**
        """
        username = "a" * 50
        is_valid, error = validate_username(username)
        assert is_valid is True
        assert error is None

    def test_validate_username_too_short(self):
        """Test that username too short is rejected."""
        is_valid, error = validate_username("ab")
        assert is_valid is False
        assert "at least 3 characters" in error

    def test_validate_username_too_long(self):
        """Test that username too long is rejected."""
        username = "a" * 51
        is_valid, error = validate_username(username)
        assert is_valid is False
        assert "at most 50 characters" in error

    def test_validate_username_with_space(self):
        """Test that username with space is rejected."""
        is_valid, error = validate_username("john doe")
        assert is_valid is False
        assert "letters, numbers, and underscores" in error

    def test_validate_username_with_special_characters(self):
        """Test that username with special characters is rejected."""
        is_valid, error = validate_username("john@doe")
        assert is_valid is False
        assert "letters, numbers, and underscores" in error

    def test_validate_username_with_dash(self):
        """Test that username with dash is rejected."""
        is_valid, error = validate_username("john-doe")
        assert is_valid is False
        assert "letters, numbers, and underscores" in error

    def test_validate_username_non_string_returns_false(self):
        """Test that non-string username returns False."""
        is_valid, error = validate_username(123)
        assert is_valid is False

    def test_validate_username_none_returns_false(self):
        """Test that None username returns False."""
        is_valid, error = validate_username(None)
        assert is_valid is False

    def test_validate_username_empty_string(self):
        """Test that empty string is rejected."""
        is_valid, error = validate_username("")
        assert is_valid is False

    def test_validate_username_uppercase_letters(self):
        """Test that uppercase letters are allowed."""
        is_valid, error = validate_username("JohnDoe")
        assert is_valid is True
        assert error is None


class TestPasswordValidation:
    """Test password validation."""

    def test_validate_password_valid_simple(self):
        """Test validation of simple valid password."""
        is_valid, error = validate_password("Password1")
        assert is_valid is True
        assert error is None

    def test_validate_password_valid_with_special_chars(self):
        """Test validation of password with special characters."""
        is_valid, error = validate_password("P@ssw0rd!")
        assert is_valid is True
        assert error is None

    def test_validate_password_valid_minimum_length(self):
        """Test validation of password at minimum length (8 chars).
        
        **Validates: Requirements 1.3**
        """
        is_valid, error = validate_password("Pass1234")
        assert is_valid is True
        assert error is None

    def test_validate_password_too_short(self):
        """Test that password too short is rejected."""
        is_valid, error = validate_password("Pass123")  # 7 chars
        assert is_valid is False
        assert "at least 8 characters" in error

    def test_validate_password_no_letters(self):
        """Test that password with only numbers is rejected.
        
        **Validates: Requirements 1.4**
        """
        is_valid, error = validate_password("12345678")
        assert is_valid is False
        assert "at least one letter" in error

    def test_validate_password_no_numbers(self):
        """Test that password with only letters is rejected.
        
        **Validates: Requirements 1.4**
        """
        is_valid, error = validate_password("Password")
        assert is_valid is False
        assert "at least one number" in error

    def test_validate_password_uppercase_and_number(self):
        """Test that uppercase letter and number is valid."""
        is_valid, error = validate_password("Abcdefgh1")
        assert is_valid is True
        assert error is None

    def test_validate_password_lowercase_and_number(self):
        """Test that lowercase letter and number is valid."""
        is_valid, error = validate_password("abcdefgh1")
        assert is_valid is True
        assert error is None

    def test_validate_password_non_string_returns_false(self):
        """Test that non-string password returns False."""
        is_valid, error = validate_password(123)
        assert is_valid is False

    def test_validate_password_none_returns_false(self):
        """Test that None password returns False."""
        is_valid, error = validate_password(None)
        assert is_valid is False

    def test_validate_password_empty_string(self):
        """Test that empty string is rejected."""
        is_valid, error = validate_password("")
        assert is_valid is False

    def test_validate_password_too_long(self):
        """Test that password too long is rejected."""
        password = "a" * 129
        is_valid, error = validate_password(password)
        assert is_valid is False
        assert "at most 128 characters" in error

    def test_validate_password_with_unicode(self):
        """Test that password with unicode letters is valid."""
        is_valid, error = validate_password("Pässwörd1")
        assert is_valid is True
        assert error is None


class TestUserRegistration:
    """Test user registration logic."""

    def test_signup_success(self, db):
        """Test successful user registration.
        
        **Validates: Requirements 1.1, 1.7, 1.8**
        """
        success, error, user = signup(db, "testuser", "Password123")
        assert success is True
        assert error is None
        assert user is not None
        assert user['username'] == "testuser"

    def test_signup_duplicate_username(self, db):
        """Test that duplicate username is rejected.
        
        **Validates: Requirements 1.2**
        """
        # First signup
        signup(db, "testuser", "Password123")
        
        # Second signup with same username
        success, error, user = signup(db, "testuser", "Password456")
        assert success is False
        assert "already taken" in error
        assert user is None

    def test_signup_invalid_username_too_short(self, db):
        """Test that signup with short username is rejected."""
        success, error, user = signup(db, "ab", "Password123")
        assert success is False
        assert "at least 3 characters" in error
        assert user is None

    def test_signup_invalid_username_too_long(self, db):
        """Test that signup with long username is rejected."""
        username = "a" * 51
        success, error, user = signup(db, username, "Password123")
        assert success is False
        assert "at most 50 characters" in error
        assert user is None

    def test_signup_invalid_password_too_short(self, db):
        """Test that signup with short password is rejected."""
        success, error, user = signup(db, "testuser", "Pass123")
        assert success is False
        assert "at least 8 characters" in error
        assert user is None

    def test_signup_invalid_password_no_letters(self, db):
        """Test that signup with numbers-only password is rejected."""
        success, error, user = signup(db, "testuser", "12345678")
        assert success is False
        assert "at least one letter" in error
        assert user is None

    def test_signup_invalid_password_no_numbers(self, db):
        """Test that signup with letters-only password is rejected."""
        success, error, user = signup(db, "testuser", "Password")
        assert success is False
        assert "at least one number" in error
        assert user is None

    def test_signup_password_is_hashed(self, db):
        """Test that password is hashed, not stored plaintext."""
        success, error, user = signup(db, "testuser", "Password123")
        assert success is True
        
        # Retrieve user from database
        db_user = db.get_user_by_username("testuser")
        assert db_user.password_hash != "Password123"

    def test_signup_multiple_users(self, db):
        """Test creating multiple user accounts."""
        success1, _, user1 = signup(db, "user1", "Password123")
        success2, _, user2 = signup(db, "user2", "Password456")
        
        assert success1 is True
        assert success2 is True
        assert user1['username'] == "user1"
        assert user2['username'] == "user2"


class TestUserLogin:
    """Test user login logic."""

    def test_login_success(self, db):
        """Test successful user login.
        
        **Validates: Requirements 2.1**
        """
        # Create user
        signup(db, "testuser", "Password123")
        
        # Login
        success, error, user = login(db, "testuser", "Password123")
        assert success is True
        assert error is None
        assert user is not None
        assert user['username'] == "testuser"

    def test_login_wrong_password(self, db):
        """Test login with wrong password.
        
        **Validates: Requirements 2.2**
        """
        # Create user
        signup(db, "testuser", "Password123")
        
        # Login with wrong password
        success, error, user = login(db, "testuser", "WrongPassword")
        assert success is False
        assert error == "Invalid credentials"
        assert user is None

    def test_login_nonexistent_user(self, db):
        """Test login with non-existent username.
        
        **Validates: Requirements 2.3**
        """
        success, error, user = login(db, "nonexistent", "Password123")
        assert success is False
        assert error == "Invalid credentials"
        assert user is None

    def test_login_generic_error_message_wrong_password(self, db):
        """Test that error message is generic for wrong password.
        
        **Validates: Requirements 2.4**
        """
        # Create user
        signup(db, "testuser", "Password123")
        
        # Login with wrong password
        success, error, _ = login(db, "testuser", "WrongPassword")
        assert error == "Invalid credentials"

    def test_login_generic_error_message_nonexistent_user(self, db):
        """Test that error message is generic for non-existent user.
        
        **Validates: Requirements 2.4**
        """
        success, error, _ = login(db, "nonexistent", "Password123")
        assert error == "Invalid credentials"

    def test_login_case_sensitive_username(self, db):
        """Test that username is case-sensitive."""
        # Create user with lowercase username
        signup(db, "testuser", "Password123")
        
        # Try to login with uppercase username
        success, error, user = login(db, "TestUser", "Password123")
        assert success is False
        assert error == "Invalid credentials"

    def test_login_case_sensitive_password(self, db):
        """Test that password is case-sensitive."""
        # Create user
        signup(db, "testuser", "Password123")
        
        # Try to login with different case password
        success, error, user = login(db, "testuser", "password123")
        assert success is False
        assert error == "Invalid credentials"

    def test_login_multiple_users(self, db):
        """Test login for multiple users."""
        # Create users
        signup(db, "user1", "Password123")
        signup(db, "user2", "Password456")
        
        # Login as user1
        success1, _, user1 = login(db, "user1", "Password123")
        assert success1 is True
        assert user1['username'] == "user1"
        
        # Login as user2
        success2, _, user2 = login(db, "user2", "Password456")
        assert success2 is True
        assert user2['username'] == "user2"

    def test_login_after_failed_attempt(self, db):
        """Test successful login after failed attempt."""
        # Create user
        signup(db, "testuser", "Password123")
        
        # Failed login
        login(db, "testuser", "WrongPassword")
        
        # Successful login
        success, error, user = login(db, "testuser", "Password123")
        assert success is True
        assert error is None
        assert user is not None


class TestAuthenticationIntegration:
    """Integration tests for authentication functions."""

    def test_signup_and_login_flow(self, db):
        """Test complete signup and login flow."""
        # Signup
        signup_success, signup_error, signup_user = signup(
            db, "testuser", "Password123"
        )
        assert signup_success is True
        
        # Login
        login_success, login_error, login_user = login(
            db, "testuser", "Password123"
        )
        assert login_success is True
        assert login_user['username'] == signup_user['username']

    def test_password_hash_consistency(self, db):
        """Test that password hash is consistent across signup and login."""
        # Signup
        signup(db, "testuser", "Password123")
        
        # Get user from database
        user = db.get_user_by_username("testuser")
        password_hash = user.password_hash
        
        # Verify password works
        assert verify_password("Password123", password_hash) is True
        assert verify_password("WrongPassword", password_hash) is False

    def test_multiple_signup_and_login(self, db):
        """Test multiple users can signup and login independently."""
        users = [
            ("user1", "Password123"),
            ("user2", "Password456"),
            ("user3", "Password789"),
        ]
        
        # Signup all users
        for username, password in users:
            success, error, _ = signup(db, username, password)
            assert success is True
            assert error is None
        
        # Login all users
        for username, password in users:
            success, error, user = login(db, username, password)
            assert success is True
            assert error is None
            assert user['username'] == username

    def test_validation_prevents_invalid_signup(self, db):
        """Test that validation prevents invalid signups."""
        invalid_cases = [
            ("ab", "Password123", "username too short"),
            ("a" * 51, "Password123", "username too long"),
            ("user@name", "Password123", "invalid username chars"),
            ("testuser", "Pass123", "password too short"),
            ("testuser", "12345678", "password no letters"),
            ("testuser", "Password", "password no numbers"),
        ]
        
        for username, password, reason in invalid_cases:
            success, error, user = signup(db, username, password)
            assert success is False, f"Should fail for: {reason}"
            assert error is not None
            assert user is None
