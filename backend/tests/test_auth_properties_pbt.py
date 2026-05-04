"""Property-based tests for authentication and session management.

These tests verify that:
- Property 1: Valid Account Creation
- Property 2: Duplicate Username Rejection
- Property 3: Password Length Validation
- Property 4: Password Complexity Validation
- Property 5: Username Length Validation (Minimum)
- Property 6: Username Length Validation (Maximum)
- Property 7: Password Hashing
- Property 8: Successful Login Issues Token
- Property 9: Failed Login with Wrong Password
- Property 10: Failed Login with Non-Existent Username
- Property 11: Generic Error Messages
- Property 12: Session Token Expiration
- Property 13: Valid Token Acceptance
- Property 14: Expired Token Rejection
- Property 15: Invalid Token Rejection
- Property 16: Token Validation on Every Request
- Property 17: Logout Invalidates Token
- Property 24: Password Verification with Bcrypt
- Property 25: Session Token Uniqueness
- Property 26: CSRF Token Validation
- Property 27: CSRF Token Per Session

Using Hypothesis for property-based testing with minimum 5 iterations.
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck, assume
from datetime import datetime, timedelta
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from services.auth_service import (
    hash_password, verify_password, validate_username,
    validate_password, signup, login
)
from services.session_manager import (
    generate_session_token, create_session, validate_session_token,
    invalidate_session
)
from services.csrf_protection import create_csrf_token, validate_csrf_token
import time


# Hypothesis strategies for generating test data
@st.composite
def valid_usernames(draw):
    """Generate valid usernames (3-50 chars, alphanumeric + underscore)."""
    import uuid
    # Use UUID to ensure uniqueness across all test runs
    unique_id = str(uuid.uuid4())[:8]
    username = draw(st.text(
        alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_',
        min_size=1,
        max_size=30
    ))
    return f"user_{unique_id}_{username}"


@st.composite
def valid_passwords(draw):
    """Generate valid passwords (8+ chars, letters and numbers)."""
    # Generate letters and digits separately to ensure both are present
    letters = draw(st.text(
        alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        min_size=4,
        max_size=10
    ))
    digits = draw(st.text(
        alphabet='0123456789',
        min_size=4,
        max_size=10
    ))
    # Combine to ensure at least 8 characters
    combined = letters + digits
    return combined


@st.composite
def invalid_short_usernames(draw):
    """Generate invalid usernames (< 3 chars)."""
    return draw(st.text(
        alphabet='abcdefghijklmnopqrstuvwxyz',
        min_size=0,
        max_size=2
    ))


@st.composite
def invalid_long_usernames(draw):
    """Generate invalid usernames (> 50 chars)."""
    return draw(st.text(
        alphabet='abcdefghijklmnopqrstuvwxyz',
        min_size=51,
        max_size=100
    ))


@st.composite
def invalid_short_passwords(draw):
    """Generate invalid passwords (< 8 chars)."""
    return draw(st.text(
        alphabet='abcdefghijklmnopqrstuvwxyz0123456789',
        min_size=0,
        max_size=7
    ))


@st.composite
def letters_only_passwords(draw):
    """Generate passwords with only letters (no numbers)."""
    return draw(st.text(
        alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        min_size=8,
        max_size=20
    ))


@st.composite
def numbers_only_passwords(draw):
    """Generate passwords with only numbers (no letters)."""
    return draw(st.text(
        alphabet='0123456789',
        min_size=8,
        max_size=20
    ))


@pytest.fixture(scope='function')
def app(tmp_path):
    """Create and configure a test Flask application with a temporary database."""
    import os
    import uuid
    
    # Create a unique temporary database file for this test
    db_file = tmp_path / f"test_{uuid.uuid4()}.db"
    
    # Temporarily set environment to avoid loading .env
    os.environ['DATABASE_PATH'] = str(db_file)
    os.environ['ENVIRONMENT'] = 'testing'
    
    app = create_app()
    app.config['TESTING'] = True
    app.config['DATABASE'] = str(db_file)
    
    from database import TodoDatabase
    # Create a fresh database for this test
    app.db = TodoDatabase(str(db_file), run_migrations=True)
    
    yield app


@pytest.fixture(scope='function')
def client(app):
    """Create a test client for the Flask application."""
    return app.test_client()


@pytest.fixture(scope='function')
def db(app):
    """Get the database instance."""
    return app.db


class TestAuthenticationProperties:
    """Property-based tests for authentication."""

    def setup_method(self):
        """Clear database before each test method."""
        # This will be called before each test method
        pass

    @settings(
        max_examples=5,
        suppress_health_check=[
            HealthCheck.too_slow,
            HealthCheck.function_scoped_fixture
        ],
        deadline=None
    )
    @given(
        username=valid_usernames(),
        password=valid_passwords(),
    )
    def test_property_1_valid_account_creation(
        self,
        db,
        username,
        password,
    ):
        """Property 1: Valid Account Creation

        For any valid username (3-50 characters) and valid password
        (8+ characters with letters and numbers), submitting a signup
        form SHALL result in a new user account being created and
        retrievable from the database.

        **Validates: Requirements 1.1, 1.7, 1.8**
        """
        success, error, user_data = signup(db, username, password)

        assert success is True
        assert error is None
        assert user_data is not None
        assert user_data['username'] == username

        # Verify user is retrievable from database
        db_user = db.get_user_by_username(username)
        assert db_user is not None
        assert db_user.username == username

    @settings(
        max_examples=5,
        suppress_health_check=[
            HealthCheck.too_slow,
            HealthCheck.function_scoped_fixture
        ],
        deadline=None
    )
    @given(
        username=valid_usernames(),
        password=valid_passwords(),
    )
    def test_property_2_duplicate_username_rejection(
        self,
        db,
        username,
        password,
    ):
        """Property 2: Duplicate Username Rejection

        For any existing username, attempting to create a new account
        with that username SHALL result in rejection with an error
        message indicating the username is taken.

        **Validates: Requirements 1.2**
        """
        # Create first account
        success1, error1, user_data1 = signup(db, username, password)
        assert success1 is True

        # Attempt to create duplicate account
        success2, error2, user_data2 = signup(db, username, password)

        assert success2 is False
        assert error2 is not None
        assert "already taken" in error2.lower()
        assert user_data2 is None

    @settings(
        max_examples=5,
        suppress_health_check=[
            HealthCheck.too_slow,
            HealthCheck.function_scoped_fixture
        ],
        deadline=None
    )
    @given(
        username=valid_usernames(),
        password=invalid_short_passwords(),
    )
    def test_property_3_password_length_validation(
        self,
        db,
        username,
        password,
    ):
        """Property 3: Password Length Validation

        For any password with fewer than 8 characters, attempting to
        create an account SHALL result in rejection with an error
        message indicating the password is too short.

        **Validates: Requirements 1.3**
        """
        success, error, user_data = signup(db, username, password)

        assert success is False
        assert error is not None
        assert "short" in error.lower() or "8" in error
        assert user_data is None

    @settings(
        max_examples=5,
        suppress_health_check=[
            HealthCheck.too_slow,
            HealthCheck.function_scoped_fixture
        ],
        deadline=None
    )
    @given(
        username=valid_usernames(),
        password=st.one_of(
            letters_only_passwords(),
            numbers_only_passwords()
        ),
    )
    def test_property_4_password_complexity_validation(
        self,
        db,
        username,
        password,
    ):
        """Property 4: Password Complexity Validation

        For any password containing only letters or only numbers
        (no mix), attempting to create an account SHALL result in
        rejection with an error message indicating the password must
        contain both letters and numbers.

        **Validates: Requirements 1.4**
        """
        success, error, user_data = signup(db, username, password)

        assert success is False
        assert error is not None
        assert "letter" in error.lower() or "number" in error.lower()
        assert user_data is None

    @settings(
        max_examples=5,
        suppress_health_check=[
            HealthCheck.too_slow,
            HealthCheck.function_scoped_fixture
        ],
        deadline=None
    )
    @given(
        username=invalid_short_usernames(),
        password=valid_passwords(),
    )
    def test_property_5_username_length_validation_minimum(
        self,
        db,
        username,
        password,
    ):
        """Property 5: Username Length Validation (Minimum)

        For any username with fewer than 3 characters, attempting to
        create an account SHALL result in rejection with an error
        message indicating the username is too short.

        **Validates: Requirements 1.5**
        """
        success, error, user_data = signup(db, username, password)

        assert success is False
        assert error is not None
        assert "short" in error.lower() or "3" in error
        assert user_data is None

    @settings(
        max_examples=5,
        suppress_health_check=[
            HealthCheck.too_slow,
            HealthCheck.function_scoped_fixture
        ],
        deadline=None
    )
    @given(
        username=invalid_long_usernames(),
        password=valid_passwords(),
    )
    def test_property_6_username_length_validation_maximum(
        self,
        db,
        username,
        password,
    ):
        """Property 6: Username Length Validation (Maximum)

        For any username with more than 50 characters, attempting to
        create an account SHALL result in rejection with an error
        message indicating the username is too long.

        **Validates: Requirements 1.6**
        """
        success, error, user_data = signup(db, username, password)

        assert success is False
        assert error is not None
        assert "long" in error.lower() or "50" in error
        assert user_data is None

    @settings(
        max_examples=5,
        suppress_health_check=[
            HealthCheck.too_slow,
            HealthCheck.function_scoped_fixture
        ],
        deadline=None
    )
    @given(
        username=valid_usernames(),
        password=valid_passwords(),
    )
    def test_property_7_password_hashing(
        self,
        db,
        username,
        password,
    ):
        """Property 7: Password Hashing

        For any user account, the stored password hash SHALL NOT equal
        the plaintext password submitted during signup.

        **Validates: Requirements 1.7, 1.8, 9.1**
        """
        success, error, user_data = signup(db, username, password)
        assert success is True

        # Retrieve user from database
        db_user = db.get_user_by_username(username)
        assert db_user is not None

        # Verify password hash is not plaintext
        assert db_user.password_hash != password
        assert len(db_user.password_hash) > len(password)

    @settings(
        max_examples=5,
        suppress_health_check=[
            HealthCheck.too_slow,
            HealthCheck.function_scoped_fixture
        ],
        deadline=None
    )
    @given(
        username=valid_usernames(),
        password=valid_passwords(),
    )
    def test_property_8_successful_login_issues_token(
        self,
        db,
        username,
        password,
    ):
        """Property 8: Successful Login Issues Token

        For any valid username and correct password, submitting a login
        form SHALL result in a session token being issued.

        **Validates: Requirements 2.1**
        """
        # Create account
        signup(db, username, password)

        # Login
        success, error, user_data = login(db, username, password)
        assert success is True
        assert error is None
        assert user_data is not None

        # Create session
        session_success, session_error, session_result = create_session(
            db,
            user_data['id']
        )
        assert session_success is True
        assert session_error is None
        assert session_result is not None
        token, session = session_result
        assert token is not None
        assert len(token) > 0

    @settings(
        max_examples=5,
        suppress_health_check=[
            HealthCheck.too_slow,
            HealthCheck.function_scoped_fixture
        ],
        deadline=None
    )
    @given(
        username=valid_usernames(),
        password=valid_passwords(),
        wrong_password=valid_passwords(),
    )
    def test_property_9_failed_login_wrong_password(
        self,
        db,
        username,
        password,
        wrong_password,
    ):
        """Property 9: Failed Login with Wrong Password

        For any valid username and incorrect password, submitting a
        login form SHALL result in rejection.

        **Validates: Requirements 2.2**
        """
        # Skip if passwords are the same
        assume(password != wrong_password)

        # Create account
        signup(db, username, password)

        # Login with wrong password
        success, error, user_data = login(db, username, wrong_password)

        assert success is False
        assert error is not None
        assert user_data is None

    @settings(
        max_examples=5,
        suppress_health_check=[
            HealthCheck.too_slow,
            HealthCheck.function_scoped_fixture
        ],
        deadline=None
    )
    @given(
        username=valid_usernames(),
        password=valid_passwords(),
        nonexistent_username=valid_usernames(),
    )
    def test_property_10_failed_login_nonexistent_username(
        self,
        db,
        username,
        password,
        nonexistent_username,
    ):
        """Property 10: Failed Login with Non-Existent Username

        For any non-existent username, submitting a login form SHALL
        result in rejection.

        **Validates: Requirements 2.3**
        """
        # Skip if usernames are the same
        assume(username != nonexistent_username)

        # Create account with first username
        signup(db, username, password)

        # Login with non-existent username
        success, error, user_data = login(
            db,
            nonexistent_username,
            password
        )

        assert success is False
        assert error is not None
        assert user_data is None

    @settings(
        max_examples=5,
        suppress_health_check=[
            HealthCheck.too_slow,
            HealthCheck.function_scoped_fixture
        ],
        deadline=None
    )
    @given(
        username=valid_usernames(),
        password=valid_passwords(),
        wrong_password=valid_passwords(),
    )
    def test_property_11_generic_error_messages(
        self,
        db,
        username,
        password,
        wrong_password,
    ):
        """Property 11: Generic Error Messages

        For any login attempt with either invalid username or invalid
        password, the error message returned SHALL be identical and
        generic (not revealing which field was invalid).

        **Validates: Requirements 2.4, 7.4**
        """
        # Skip if passwords are the same
        assume(password != wrong_password)

        # Create account
        signup(db, username, password)

        # Login with wrong password
        success1, error1, _ = login(db, username, wrong_password)
        assert success1 is False

        # Login with non-existent username
        success2, error2, _ = login(db, "nonexistent_user_xyz", password)
        assert success2 is False

        # Verify error messages are identical
        assert error1 == error2
        assert "invalid" in error1.lower() or "credentials" in error1.lower()

    @settings(
        max_examples=5,
        suppress_health_check=[
            HealthCheck.too_slow,
            HealthCheck.function_scoped_fixture
        ],
        deadline=None
    )
    @given(
        username=valid_usernames(),
        password=valid_passwords(),
    )
    def test_property_12_session_token_expiration(
        self,
        db,
        username,
        password,
    ):
        """Property 12: Session Token Expiration

        For any session token, the token SHALL expire exactly 24 hours
        after creation.

        **Validates: Requirements 2.5, 3.1, 10.6**
        """
        # Create account and login
        signup(db, username, password)
        success, error, user_data = login(db, username, password)
        assert success is True

        # Create session
        session_success, _, session_result = create_session(
            db,
            user_data['id']
        )
        assert session_success is True
        token, session = session_result

        # Verify expiration is approximately 24 hours from now
        now = datetime.now()
        expected_expiration = now + timedelta(hours=24)

        # Allow 1 minute tolerance for test execution time
        time_diff = abs(
            (session.expires_at - expected_expiration).total_seconds()
        )
        assert time_diff < 60

    @settings(
        max_examples=5,
        suppress_health_check=[
            HealthCheck.too_slow,
            HealthCheck.function_scoped_fixture
        ],
        deadline=None
    )
    @given(
        username=valid_usernames(),
        password=valid_passwords(),
    )
    def test_property_13_valid_token_acceptance(
        self,
        db,
        username,
        password,
    ):
        """Property 13: Valid Token Acceptance

        For any valid (non-expired) session token, making a request
        with that token SHALL succeed and allow the request to proceed.

        **Validates: Requirements 3.2**
        """
        # Create account and login
        signup(db, username, password)
        success, error, user_data = login(db, username, password)
        assert success is True

        # Create session
        session_success, _, session_result = create_session(
            db,
            user_data['id']
        )
        assert session_success is True
        token, session = session_result

        # Validate token
        is_valid, error, retrieved_session = validate_session_token(
            db,
            token
        )

        assert is_valid is True
        assert error is None
        assert retrieved_session is not None
        assert retrieved_session.user_id == user_data['id']

    @settings(
        max_examples=5,
        suppress_health_check=[
            HealthCheck.too_slow,
            HealthCheck.function_scoped_fixture
        ],
        deadline=None
    )
    @given(
        username=valid_usernames(),
        password=valid_passwords(),
    )
    def test_property_14_expired_token_rejection(
        self,
        db,
        username,
        password,
    ):
        """Property 14: Expired Token Rejection

        For any expired session token, making a request with that token
        SHALL result in a 401 Unauthorized response.

        **Validates: Requirements 3.3**
        """
        # Create account and login
        signup(db, username, password)
        success, error, user_data = login(db, username, password)
        assert success is True

        # Create session
        session_success, _, session_result = create_session(
            db,
            user_data['id']
        )
        assert session_success is True
        token, session = session_result

        # Manually expire the session
        expired_time = datetime.now() - timedelta(hours=1)
        db.update_session_expiration(session.id, expired_time)

        # Validate token (should fail)
        is_valid, error, retrieved_session = validate_session_token(
            db,
            token
        )

        assert is_valid is False
        assert error is not None
        assert retrieved_session is None

    @settings(
        max_examples=5,
        suppress_health_check=[
            HealthCheck.too_slow,
            HealthCheck.function_scoped_fixture
        ],
        deadline=None
    )
    @given(
        username=valid_usernames(),
        password=valid_passwords(),
    )
    def test_property_15_invalid_token_rejection(
        self,
        db,
        username,
        password,
    ):
        """Property 15: Invalid Token Rejection

        For any invalid or tampered session token, making a request
        with that token SHALL result in a 401 Unauthorized response.

        **Validates: Requirements 3.4**
        """
        # Try to validate a completely invalid token
        invalid_token = "invalid_token_xyz_123"

        is_valid, error, retrieved_session = validate_session_token(
            db,
            invalid_token
        )

        assert is_valid is False
        assert error is not None
        assert retrieved_session is None

    @settings(
        max_examples=5,
        suppress_health_check=[
            HealthCheck.too_slow,
            HealthCheck.function_scoped_fixture
        ],
        deadline=None
    )
    @given(
        username=valid_usernames(),
        password=valid_passwords(),
    )
    def test_property_16_token_validation_every_request(
        self,
        db,
        username,
        password,
    ):
        """Property 16: Token Validation on Every Request

        For any sequence of requests with valid session tokens, each
        request SHALL validate the token before proceeding.

        **Validates: Requirements 3.6, 10.5**
        """
        # Create account and login
        signup(db, username, password)
        success, error, user_data = login(db, username, password)
        assert success is True

        # Create session
        session_success, _, session_result = create_session(
            db,
            user_data['id']
        )
        assert session_success is True
        token, session = session_result

        # Validate token multiple times
        for _ in range(3):
            is_valid, error, retrieved_session = validate_session_token(
                db,
                token
            )
            assert is_valid is True
            assert error is None
            assert retrieved_session is not None

    @settings(
        max_examples=5,
        suppress_health_check=[
            HealthCheck.too_slow,
            HealthCheck.function_scoped_fixture
        ],
        deadline=None
    )
    @given(
        username=valid_usernames(),
        password=valid_passwords(),
    )
    def test_property_17_logout_invalidates_token(
        self,
        db,
        username,
        password,
    ):
        """Property 17: Logout Invalidates Token

        For any session token, after logout is called, that token SHALL
        no longer be valid for subsequent requests.

        **Validates: Requirements 4.1, 4.4**
        """
        # Create account and login
        signup(db, username, password)
        success, error, user_data = login(db, username, password)
        assert success is True

        # Create session
        session_success, _, session_result = create_session(
            db,
            user_data['id']
        )
        assert session_success is True
        token, session = session_result

        # Verify token is valid before logout
        is_valid_before, _, _ = validate_session_token(db, token)
        assert is_valid_before is True

        # Logout
        logout_success, logout_error = invalidate_session(db, token)
        assert logout_success is True

        # Verify token is invalid after logout
        is_valid_after, _, _ = validate_session_token(db, token)
        assert is_valid_after is False

    @settings(
        max_examples=5,
        suppress_health_check=[
            HealthCheck.too_slow,
            HealthCheck.function_scoped_fixture
        ],
        deadline=None
    )
    @given(
        username=valid_usernames(),
        password=valid_passwords(),
        wrong_password=valid_passwords(),
    )
    def test_property_24_password_verification_bcrypt(
        self,
        db,
        username,
        password,
        wrong_password,
    ):
        """Property 24: Password Verification with Bcrypt

        For any user account, logging in with the correct password SHALL
        succeed, and logging in with an incorrect password SHALL fail.

        **Validates: Requirements 9.5**
        """
        # Skip if passwords are the same
        assume(password != wrong_password)

        # Create account
        signup(db, username, password)

        # Login with correct password
        success_correct, _, _ = login(db, username, password)
        assert success_correct is True

        # Login with incorrect password
        success_incorrect, _, _ = login(db, username, wrong_password)
        assert success_incorrect is False

    @settings(
        max_examples=5,
        suppress_health_check=[
            HealthCheck.too_slow,
            HealthCheck.function_scoped_fixture
        ],
        deadline=None
    )
    @given(
        username1=valid_usernames(),
        password1=valid_passwords(),
        username2=valid_usernames(),
        password2=valid_passwords(),
    )
    def test_property_25_session_token_uniqueness(
        self,
        db,
        username1,
        password1,
        username2,
        password2,
    ):
        """Property 25: Session Token Uniqueness

        For any sequence of login operations, each session token
        generated SHALL be unique.

        **Validates: Requirements 10.1**
        """
        # Skip if usernames are the same
        assume(username1 != username2)

        # Create two accounts
        signup(db, username1, password1)
        signup(db, username2, password2)

        # Login both users
        success1, _, user_data1 = login(db, username1, password1)
        success2, _, user_data2 = login(db, username2, password2)
        assert success1 is True
        assert success2 is True

        # Create sessions for both
        _, _, session_result1 = create_session(db, user_data1['id'])
        _, _, session_result2 = create_session(db, user_data2['id'])
        token1, _ = session_result1
        token2, _ = session_result2

        # Verify tokens are unique
        assert token1 != token2

    @settings(
        max_examples=5,
        suppress_health_check=[
            HealthCheck.too_slow,
            HealthCheck.function_scoped_fixture
        ],
        deadline=None
    )
    @given(
        username=valid_usernames(),
        password=valid_passwords(),
    )
    def test_property_26_csrf_token_validation(
        self,
        db,
        username,
        password,
    ):
        """Property 26: CSRF Token Validation

        For any state-changing request (POST, PUT, DELETE) without a
        valid CSRF token, the request SHALL be rejected.

        **Validates: Requirements 11.1, 11.3**
        """
        # Create account and login
        signup(db, username, password)
        success, error, user_data = login(db, username, password)
        assert success is True

        # Create session
        session_success, _, session_result = create_session(
            db,
            user_data['id']
        )
        assert session_success is True
        token, session = session_result

        # Create CSRF token
        csrf_success, csrf_error, csrf_result = create_csrf_token(
            db,
            session.id
        )
        assert csrf_success is True
        csrf_token, csrf_obj = csrf_result

        # Validate CSRF token
        is_valid, error = validate_csrf_token(db, session.id, csrf_token)
        assert is_valid is True

        # Validate invalid CSRF token
        is_valid_invalid, error_invalid = validate_csrf_token(
            db,
            session.id,
            "invalid_csrf_token"
        )
        assert is_valid_invalid is False

    @settings(
        max_examples=5,
        suppress_health_check=[
            HealthCheck.too_slow,
            HealthCheck.function_scoped_fixture
        ],
        deadline=None
    )
    @given(
        username1=valid_usernames(),
        password1=valid_passwords(),
        username2=valid_usernames(),
        password2=valid_passwords(),
    )
    def test_property_27_csrf_token_per_session(
        self,
        db,
        username1,
        password1,
        username2,
        password2,
    ):
        """Property 27: CSRF Token Per Session

        For any user session, the CSRF token generated for that session
        SHALL be unique and different from tokens in other sessions.

        **Validates: Requirements 11.4**
        """
        # Skip if usernames are the same
        assume(username1 != username2)

        # Create two accounts
        signup(db, username1, password1)
        signup(db, username2, password2)

        # Login both users
        success1, _, user_data1 = login(db, username1, password1)
        success2, _, user_data2 = login(db, username2, password2)
        assert success1 is True
        assert success2 is True

        # Create sessions for both
        _, _, session_result1 = create_session(db, user_data1['id'])
        _, _, session_result2 = create_session(db, user_data2['id'])
        _, session1 = session_result1
        _, session2 = session_result2

        # Create CSRF tokens for both sessions
        csrf_success1, _, csrf_result1 = create_csrf_token(
            db,
            session1.id
        )
        csrf_success2, _, csrf_result2 = create_csrf_token(
            db,
            session2.id
        )
        assert csrf_success1 is True
        assert csrf_success2 is True

        csrf_token1, _ = csrf_result1
        csrf_token2, _ = csrf_result2

        # Verify CSRF tokens are unique
        assert csrf_token1 != csrf_token2
