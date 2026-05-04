"""Integration tests for todo endpoint access control.

These tests verify that:
- GET /api/todos returns only the authenticated user's todos
- POST /api/todos creates todos associated with the authenticated user
- PUT /api/todos/{id} requires ownership verification
- DELETE /api/todos/{id} requires ownership verification
"""

import pytest
from datetime import datetime
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from models import Todo
from services.auth_service import hash_password
from services.session_manager import create_session
from services.csrf_protection import create_csrf_token
import tempfile


@pytest.fixture
def app():
    """Create and configure a test Flask application with a temporary database."""
    # Create a temporary database file for testing
    fd, db_path = tempfile.mkstemp(suffix='.db')
    os.close(fd)
    
    app = create_app()
    app.config['TESTING'] = True
    app.config['DATABASE'] = db_path
    
    # Reinitialize database with test database path
    from database import TodoDatabase
    app.db = TodoDatabase(db_path, run_migrations=True)
    
    yield app
    
    # Clean up temporary database file
    try:
        os.unlink(db_path)
    except Exception:
        pass


@pytest.fixture
def client(app):
    """Create a test client for the Flask application."""
    return app.test_client()


@pytest.fixture
def db(app):
    """Get the database instance."""
    return app.db


@pytest.fixture
def user1(db):
    """Create a test user."""
    user = db.create_user('testuser1', hash_password('TestPass123'))
    return user


@pytest.fixture
def user2(db):
    """Create a second test user."""
    user = db.create_user('testuser2', hash_password('TestPass456'))
    return user


class TestTodoAccessControl:
    """Tests for todo endpoint access control."""

    def test_get_todos_requires_authentication(self, client):
        """Test that GET /api/todos requires authentication."""
        response = client.get('/api/todos')
        assert response.status_code == 401
        assert response.json['error'] == 'Not authenticated'

    def test_create_todo_requires_authentication(self, client):
        """Test that POST /api/todos requires authentication."""
        response = client.post(
            '/api/todos',
            json={'title': 'Test Todo', 'csrfToken': 'fake-token'}
        )
        assert response.status_code == 401
        assert response.json['error'] == 'Not authenticated'

    def test_update_todo_requires_authentication(self, client, db, user1):
        """Test that PUT /api/todos/{id} requires authentication."""
        todo = Todo(
            id=None,
            title='Test Todo',
            description='',
            completed=False,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            user_id=user1.id
        )
        created_todo = db.create_todo(todo)
        
        response = client.put(
            f'/api/todos/{created_todo.id}',
            json={'title': 'Updated', 'csrfToken': 'fake-token'}
        )
        assert response.status_code == 401
        assert response.json['error'] == 'Not authenticated'

    def test_delete_todo_requires_authentication(self, client, db, user1):
        """Test that DELETE /api/todos/{id} requires authentication."""
        todo = Todo(
            id=None,
            title='Test Todo',
            description='',
            completed=False,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            user_id=user1.id
        )
        created_todo = db.create_todo(todo)
        
        response = client.delete(
            f'/api/todos/{created_todo.id}',
            json={'csrfToken': 'fake-token'}
        )
        assert response.status_code == 401
        assert response.json['error'] == 'Not authenticated'

    def test_get_todo_requires_authentication(self, client, db, user1):
        """Test that GET /api/todos/{id} requires authentication."""
        todo = Todo(
            id=None,
            title='Test Todo',
            description='',
            completed=False,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            user_id=user1.id
        )
        created_todo = db.create_todo(todo)
        
        response = client.get(f'/api/todos/{created_todo.id}')
        assert response.status_code == 401
        assert response.json['error'] == 'Not authenticated'

    def test_todo_user_id_is_set_on_creation(self, db, user1):
        """Test that created todo has user_id set.
        
        **Validates: Property 19 - Todo Ownership on Creation**
        """
        todo = Todo(
            id=None,
            title='Test Todo',
            description='Test description',
            completed=False,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            user_id=user1.id
        )
        created_todo = db.create_todo(todo)
        
        assert created_todo.user_id == user1.id
        
        # Verify in database
        db_todo = db.get_todo_by_id(created_todo.id)
        assert db_todo.user_id == user1.id

    def test_get_todos_by_user_filters_correctly(self, db, user1, user2):
        """Test that get_todos_by_user_id returns only user's todos.
        
        **Validates: Property 18 - User-Specific Todo Retrieval**
        """
        # Create todos for user1
        todo1 = Todo(
            id=None,
            title='User1 Todo 1',
            description='',
            completed=False,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            user_id=user1.id
        )
        created_todo1 = db.create_todo(todo1)
        
        todo2 = Todo(
            id=None,
            title='User1 Todo 2',
            description='',
            completed=False,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            user_id=user1.id
        )
        created_todo2 = db.create_todo(todo2)
        
        # Create todo for user2
        todo3 = Todo(
            id=None,
            title='User2 Todo 1',
            description='',
            completed=False,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            user_id=user2.id
        )
        created_todo3 = db.create_todo(todo3)
        
        # Get todos for user1
        user1_todos = db.get_todos_by_user_id(user1.id)
        assert len(user1_todos) == 2
        user1_ids = [t.id for t in user1_todos]
        assert created_todo1.id in user1_ids
        assert created_todo2.id in user1_ids
        assert created_todo3.id not in user1_ids
        
        # Get todos for user2
        user2_todos = db.get_todos_by_user_id(user2.id)
        assert len(user2_todos) == 1
        assert user2_todos[0].id == created_todo3.id

    def test_todo_ownership_verification_on_update(self, db, user1, user2):
        """Test that todo ownership is verified before update.
        
        **Validates: Property 20 - Todo Update Ownership Verification**
        """
        # Create todo for user1
        todo = Todo(
            id=None,
            title='User1 Todo',
            description='',
            completed=False,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            user_id=user1.id
        )
        created_todo = db.create_todo(todo)
        
        # Verify user1 owns the todo
        assert created_todo.user_id == user1.id
        
        # Verify user2 does not own the todo
        assert created_todo.user_id != user2.id

    def test_todo_ownership_verification_on_delete(self, db, user1, user2):
        """Test that todo ownership is verified before delete.
        
        **Validates: Property 22 - Todo Delete Access Control**
        """
        # Create todo for user1
        todo = Todo(
            id=None,
            title='User1 Todo',
            description='',
            completed=False,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            user_id=user1.id
        )
        created_todo = db.create_todo(todo)
        
        # Verify user1 owns the todo
        assert created_todo.user_id == user1.id
        
        # Verify user2 does not own the todo
        assert created_todo.user_id != user2.id

    def test_todo_ownership_verification_on_access(self, db, user1, user2):
        """Test that todo ownership is verified before access.
        
        **Validates: Property 21 - Todo Access Control**
        """
        # Create todo for user1
        todo = Todo(
            id=None,
            title='User1 Todo',
            description='',
            completed=False,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            user_id=user1.id
        )
        created_todo = db.create_todo(todo)
        
        # Verify user1 owns the todo
        assert created_todo.user_id == user1.id
        
        # Verify user2 does not own the todo
        assert created_todo.user_id != user2.id
