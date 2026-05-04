"""Integration tests for the user login feature.

These tests verify end-to-end flows including signup, login, todo access,
CSRF protection, rate limiting, and data isolation.
"""

import pytest
import json
import tempfile
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime, timedelta
from app import create_app
from database import TodoDatabase
from services.auth_service import hash_password
from models import User, Todo
from services.session_manager import create_session
from services.csrf_protection import create_csrf_token


@pytest.fixture
def app():
    """Create and configure a test app."""
    fd, db_path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    
    # Set environment variable for test database
    os.environ['DATABASE_PATH'] = db_path
    
    app = create_app()
    app.config['TESTING'] = True
    
    yield app
    
    # Cleanup
    try:
        os.unlink(db_path)
    except Exception:
        pass


@pytest.fixture
def client(app):
    """Create a test client."""
    return app.test_client()


@pytest.fixture
def db(app):
    """Get the database instance."""
    return app.db


class TestEndToEndLoginFlow:
    """Test complete signup → login → access todos → logout flow."""

    def test_complete_user_flow(self, client, db):
        """Test complete signup → login → access todos → logout flow.
        
        **Validates: Requirements 1.1, 2.1, 5.1, 4.1**
        """
        # Step 1: Get CSRF token for signup
        response = client.get('/api/auth/csrf-token')
        assert response.status_code == 200
        csrf_token = response.json['csrfToken']
        assert csrf_token is not None
        
        # Step 2: Signup
        signup_data = {
            'username': 'testuser',
            'password': 'password123',
            'passwordConfirm': 'password123',
            'csrfToken': csrf_token
        }
        response = client.post(
            '/api/auth/signup',
            data=json.dumps(signup_data),
            content_type='application/json'
        )
        assert response.status_code == 201
        assert response.json['success'] is True
        
        # Step 3: Get CSRF token for login
        response = client.get('/api/auth/csrf-token')
        assert response.status_code == 200
        csrf_token = response.json['csrfToken']
        
        # Step 4: Login
        login_data = {
            'username': 'testuser',
            'password': 'password123',
            'csrfToken': csrf_token
        }
        response = client.post(
            '/api/auth/login',
            data=json.dumps(login_data),
            content_type='application/json'
        )
        assert response.status_code == 200
        assert response.json['success'] is True
        csrf_token = response.json['csrfToken']
        
        # Step 5: Create a todo
        todo_data = {
            'title': 'Test Todo',
            'description': 'Test Description',
            'csrfToken': csrf_token
        }
        response = client.post(
            '/api/todos',
            data=json.dumps(todo_data),
            content_type='application/json'
        )
        assert response.status_code == 201
        todo_id = response.json['id']
        
        # Step 6: Get todos
        response = client.get('/api/todos')
        assert response.status_code == 200
        todos = response.json
        assert len(todos) > 0
        assert any(t['id'] == todo_id for t in todos)
        
        # Step 7: Logout
        response = client.post(
            '/api/auth/logout',
            data=json.dumps({'csrfToken': csrf_token}),
            content_type='application/json'
        )
        assert response.status_code == 200
        
        # Step 8: Verify cannot access todos after logout
        response = client.get('/api/todos')
        assert response.status_code == 401

    def test_session_persistence_across_requests(self, client, db):
        """Test session persists across multiple requests.
        
        **Validates: Requirements 6.2**
        """
        # Signup and login
        csrf_response = client.get('/api/auth/csrf-token')
        csrf_token = csrf_response.json['csrfToken']
        
        signup_data = {
            'username': 'persistuser',
            'password': 'password123',
            'passwordConfirm': 'password123',
            'csrfToken': csrf_token
        }
        client.post(
            '/api/auth/signup',
            data=json.dumps(signup_data),
            content_type='application/json'
        )
        
        csrf_response = client.get('/api/auth/csrf-token')
        csrf_token = csrf_response.json['csrfToken']
        
        login_data = {
            'username': 'persistuser',
            'password': 'password123',
            'csrfToken': csrf_token
        }
        login_response = client.post(
            '/api/auth/login',
            data=json.dumps(login_data),
            content_type='application/json'
        )
        assert login_response.status_code == 200
        
        # Make multiple requests with same session
        for i in range(3):
            response = client.get('/api/auth/me')
            assert response.status_code == 200
            assert response.json['user']['username'] == 'persistuser'

    def test_unauthenticated_redirect_to_login(self, client):
        """Test unauthenticated users are redirected to login.
        
        **Validates: Requirements 13.1**
        """
        response = client.get('/api/todos')
        assert response.status_code == 401


class TestCSRFProtection:
    """Test CSRF protection integration."""

    def test_csrf_token_required_for_signup(self, client):
        """Test CSRF token is required for signup.
        
        **Validates: Requirements 11.1, 11.3**
        """
        signup_data = {
            'username': 'testuser',
            'password': 'password123',
            'passwordConfirm': 'password123'
        }
        
        # Attempt signup without CSRF token
        response = client.post(
            '/api/auth/signup',
            data=json.dumps(signup_data),
            content_type='application/json'
        )
        assert response.status_code == 403

    def test_csrf_token_required_for_login(self, client):
        """Test CSRF token is required for login.
        
        **Validates: Requirements 11.1, 11.3**
        """
        login_data = {
            'username': 'testuser',
            'password': 'password123'
        }
        
        # Attempt login without CSRF token
        response = client.post(
            '/api/auth/login',
            data=json.dumps(login_data),
            content_type='application/json'
        )
        assert response.status_code == 403

    def test_csrf_token_required_for_todo_creation(self, client, db):
        """Test CSRF token is required for todo creation.
        
        **Validates: Requirements 11.1, 11.3**
        """
        # Create and login user
        user = db.create_user('testuser', hash_password('password123'))
        success, error, session_data = create_session(db, user.id)
        assert success
        token, session = session_data
        
        # Set session cookie
        client.set_cookie('session_token', token)
        
        # Attempt todo creation without CSRF token
        todo_data = {'title': 'Test Todo'}
        response = client.post(
            '/api/todos',
            data=json.dumps(todo_data),
            content_type='application/json'
        )
        assert response.status_code == 403

    def test_invalid_csrf_token_rejected(self, client):
        """Test invalid CSRF token is rejected.
        
        **Validates: Requirements 11.1, 11.3**
        """
        signup_data = {
            'username': 'testuser',
            'password': 'password123',
            'passwordConfirm': 'password123'
        }
        
        # Attempt signup with invalid CSRF token
        response = client.post(
            '/api/auth/signup',
            data=json.dumps(signup_data),
            content_type='application/json',
            headers={'X-CSRF-Token': 'invalid-token'}
        )
        assert response.status_code == 403


class TestRateLimitingIntegration:
    """Test rate limiting integration."""

    def test_rate_limit_blocks_after_5_failed_attempts(self, client):
        """Test rate limiting blocks after 5 failed attempts.
        
        **Validates: Requirements 12.1, 12.2**
        """
        csrf_response = client.get('/api/auth/csrf-token')
        csrf_token = csrf_response.json['csrfToken']
        
        login_data = {
            'username': 'nonexistent',
            'password': 'wrongpassword',
            'csrfToken': csrf_token
        }
        
        # Make 5 failed attempts
        for i in range(5):
            response = client.post(
                '/api/auth/login',
                data=json.dumps(login_data),
                content_type='application/json'
            )
            assert response.status_code == 401
        
        # 6th attempt should be blocked
        response = client.post(
            '/api/auth/login',
            data=json.dumps(login_data),
            content_type='application/json'
        )
        assert response.status_code == 429

    def test_rate_limit_returns_429(self, client):
        """Test rate limit returns 429 Too Many Requests.
        
        **Validates: Requirements 12.4**
        """
        csrf_response = client.get('/api/auth/csrf-token')
        csrf_token = csrf_response.json['csrfToken']
        
        login_data = {
            'username': 'nonexistent',
            'password': 'wrongpassword',
            'csrfToken': csrf_token
        }
        
        # Make 5 failed attempts to trigger rate limit
        for i in range(5):
            client.post(
                '/api/auth/login',
                data=json.dumps(login_data),
                content_type='application/json'
            )
        
        # Next attempt should return 429
        response = client.post(
            '/api/auth/login',
            data=json.dumps(login_data),
            content_type='application/json'
        )
        assert response.status_code == 429
        assert 'error' in response.json


class TestDataIsolation:
    """Test data isolation between users."""

    def test_user_cannot_see_other_users_todos(self, client, db):
        """Test User A cannot see User B's todos.
        
        **Validates: Requirements 5.1**
        """
        # Create two users
        user1 = db.create_user('user1', hash_password('password123'))
        user2 = db.create_user('user2', hash_password('password123'))
        
        # Create session for user1
        success, error, session_data = create_session(db, user1.id)
        assert success
        token1, session1 = session_data
        
        # Create todo for user1
        todo1_obj = Todo(
            id=None,
            title='User1 Todo',
            description='Description',
            completed=False,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            user_id=user1.id
        )
        todo1 = db.create_todo(todo1_obj)
        
        # Create todo for user2
        todo2_obj = Todo(
            id=None,
            title='User2 Todo',
            description='Description',
            completed=False,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            user_id=user2.id
        )
        todo2 = db.create_todo(todo2_obj)
        
        # Get todos as user1
        client.set_cookie('session_token', token1)
        response = client.get('/api/todos')
        assert response.status_code == 200
        todos = response.json
        
        # User1 should only see their own todo
        assert len(todos) == 1
        assert todos[0]['id'] == todo1.id
        assert todos[0]['title'] == 'User1 Todo'

    def test_user_cannot_modify_other_users_todos(self, client, db):
        """Test User A cannot modify User B's todos.
        
        **Validates: Requirements 5.3**
        """
        # Create two users
        user1 = db.create_user('user1', hash_password('password123'))
        user2 = db.create_user('user2', hash_password('password123'))
        
        # Create session for user1
        success, error, session_data = create_session(db, user1.id)
        assert success
        token1, session1 = session_data
        
        success, error, csrf_data = create_csrf_token(db, session1.id)
        assert success
        csrf_token_str, csrf_token_obj = csrf_data
        
        # Create todo for user2
        todo2_obj = Todo(
            id=None,
            title='User2 Todo',
            description='Description',
            completed=False,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            user_id=user2.id
        )
        todo2 = db.create_todo(todo2_obj)
        
        # Attempt to update user2's todo as user1
        client.set_cookie('session_token', token1)
        update_data = {
            'title': 'Modified Title',
            'completed': True,
            'csrfToken': csrf_token_str
        }
        response = client.put(
            f'/api/todos/{todo2.id}',
            data=json.dumps(update_data),
            content_type='application/json'
        )
        assert response.status_code == 403

    def test_user_cannot_delete_other_users_todos(self, client, db):
        """Test User A cannot delete User B's todos.
        
        **Validates: Requirements 5.5**
        """
        # Create two users
        user1 = db.create_user('user1', hash_password('password123'))
        user2 = db.create_user('user2', hash_password('password123'))
        
        # Create session for user1
        success, error, session_data = create_session(db, user1.id)
        assert success
        token1, session1 = session_data
        
        success, error, csrf_data = create_csrf_token(db, session1.id)
        assert success
        csrf_token_str, csrf_token_obj = csrf_data
        
        # Create todo for user2
        todo2_obj = Todo(
            id=None,
            title='User2 Todo',
            description='Description',
            completed=False,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            user_id=user2.id
        )
        todo2 = db.create_todo(todo2_obj)
        
        # Attempt to delete user2's todo as user1
        client.set_cookie('session_token', token1)
        response = client.delete(
            f'/api/todos/{todo2.id}',
            data=json.dumps({'csrfToken': csrf_token_str}),
            content_type='application/json'
        )
        assert response.status_code == 403


class TestErrorHandling:
    """Test error handling and user feedback."""

    def test_network_error_handling(self, client):
        """Test network errors display user-friendly messages.
        
        **Validates: Requirements 14.1**
        """
        # This is tested at the frontend level
        # Backend should return proper error responses
        response = client.get('/api/todos')
        assert response.status_code == 401
        assert 'error' in response.json

    def test_session_expiration_error(self, client, db):
        """Test session expiration displays expiration message.
        
        **Validates: Requirements 14.3**
        """
        # Create user and session
        user = db.create_user('testuser', hash_password('password123'))
        success, error, session_data = create_session(db, user.id)
        assert success
        token, session = session_data
        
        # Manually expire the session
        db.update_session_expiration(session.id, datetime.now() - timedelta(hours=1))
        
        # Attempt to access protected resource
        client.set_cookie('session_token', token)
        response = client.get('/api/todos')
        assert response.status_code == 401

    def test_invalid_credentials_generic_error(self, client):
        """Test invalid credentials return generic error message.
        
        **Validates: Requirements 2.4, 7.4**
        """
        csrf_response = client.get('/api/auth/csrf-token')
        csrf_token = csrf_response.json['csrfToken']
        
        # Test with non-existent username
        login_data = {
            'username': 'nonexistent',
            'password': 'password123',
            'csrfToken': csrf_token
        }
        response = client.post(
            '/api/auth/login',
            data=json.dumps(login_data),
            content_type='application/json'
        )
        assert response.status_code == 401
        error_msg_1 = response.json['error']
        
        # Test with wrong password
        db = client.application.db
        db.create_user('testuser', hash_password('password123'))
        
        csrf_response = client.get('/api/auth/csrf-token')
        csrf_token = csrf_response.json['csrfToken']
        
        login_data = {
            'username': 'testuser',
            'password': 'wrongpassword',
            'csrfToken': csrf_token
        }
        response = client.post(
            '/api/auth/login',
            data=json.dumps(login_data),
            content_type='application/json'
        )
        assert response.status_code == 401
        error_msg_2 = response.json['error']
        
        # Both errors should be the same generic message
        assert error_msg_1 == error_msg_2
        assert 'invalid' in error_msg_1.lower() or 'credentials' in error_msg_1.lower()


class TestSessionManagement:
    """Test session management features."""

    def test_session_token_validation_on_every_request(self, client, db):
        """Test session token is validated on every request.
        
        **Validates: Requirements 3.6, 10.5**
        """
        # Create user and session
        user = db.create_user('testuser', hash_password('password123'))
        success, error, session_data = create_session(db, user.id)
        assert success
        token, session = session_data
        
        # Make multiple requests with valid session
        for i in range(3):
            client.set_cookie('session_token', token)
            response = client.get('/api/auth/me')
            assert response.status_code == 200
            assert response.json['user']['username'] == 'testuser'

    def test_logout_invalidates_token(self, client, db):
        """Test logout invalidates session token.
        
        **Validates: Requirements 4.1, 4.4**
        """
        # Create user and session
        user = db.create_user('testuser', hash_password('password123'))
        success, error, session_data = create_session(db, user.id)
        assert success
        token, session = session_data
        
        success, error, csrf_data = create_csrf_token(db, session.id)
        assert success
        csrf_token_str, csrf_token_obj = csrf_data
        
        # Verify session is valid
        client.set_cookie('session_token', token)
        response = client.get('/api/auth/me')
        assert response.status_code == 200
        
        # Logout
        response = client.post(
            '/api/auth/logout',
            data=json.dumps({'csrfToken': csrf_token_str}),
            content_type='application/json'
        )
        assert response.status_code == 200
        
        # Verify session is now invalid
        response = client.get('/api/auth/me')
        assert response.status_code == 401
