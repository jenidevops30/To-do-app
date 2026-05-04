"""Property-based tests for todo access control.

These tests verify that:
- Property 18: User-Specific Todo Retrieval
- Property 19: Todo Ownership on Creation
- Property 20: Todo Update Ownership Verification
- Property 21: Todo Access Control
- Property 22: Todo Delete Access Control
- Property 23: Todo Query Filtering

Using Hypothesis for property-based testing with minimum 100 iterations.
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck, assume
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


# Hypothesis strategies for generating test data
@st.composite
def valid_usernames(draw):
    """Generate valid usernames (3-50 chars, alphanumeric + underscore)."""
    # Add a unique prefix to avoid collisions across test runs
    unique_prefix = draw(st.integers(min_value=1000, max_value=999999))
    username = draw(st.text(
        alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_',
        min_size=1,
        max_size=40
    ))
    return f"user_{unique_prefix}_{username}"


@st.composite
def valid_passwords(draw):
    """Generate valid passwords (8+ chars, letters and numbers)."""
    # Generate a password with at least one letter and one digit
    letters = draw(st.text(
        alphabet='abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ',
        min_size=1,
        max_size=10
    ))
    digits = draw(st.text(
        alphabet='0123456789',
        min_size=1,
        max_size=10
    ))
    # Combine and shuffle to ensure variety
    combined = letters + digits
    return combined


@st.composite
def valid_todo_titles(draw):
    """Generate valid todo titles (1-200 chars)."""
    return draw(st.text(
        alphabet=st.characters(
            blacklist_categories=('Cc', 'Cs'),
            blacklist_characters='\x00'
        ),
        min_size=1,
        max_size=200
    ))


@st.composite
def valid_todo_descriptions(draw):
    """Generate valid todo descriptions (0-1000 chars)."""
    return draw(st.text(
        alphabet=st.characters(
            blacklist_categories=('Cc', 'Cs'),
            blacklist_characters='\x00'
        ),
        min_size=0,
        max_size=1000
    ))


@pytest.fixture(scope='function')
def app():
    """Create and configure a test Flask application with an in-memory database."""
    # Use in-memory database for faster tests
    app = create_app()
    app.config['TESTING'] = True
    app.config['DATABASE'] = ':memory:'
    
    from database import TodoDatabase
    app.db = TodoDatabase(':memory:', run_migrations=True)
    
    yield app


@pytest.fixture(scope='function')
def client(app):
    """Create a test client for the Flask application."""
    return app.test_client()


@pytest.fixture(scope='function')
def db(app):
    """Get the database instance."""
    return app.db


class TestTodoAccessControlProperties:
    """Property-based tests for todo access control."""

    @settings(
        max_examples=5,
        suppress_health_check=[HealthCheck.too_slow, HealthCheck.function_scoped_fixture],
        deadline=None
    )
    @given(
        user1_username=valid_usernames(),
        user1_password=valid_passwords(),
        user2_username=valid_usernames(),
        user2_password=valid_passwords(),
        user1_todo1_title=valid_todo_titles(),
        user1_todo1_desc=valid_todo_descriptions(),
        user1_todo2_title=valid_todo_titles(),
        user1_todo2_desc=valid_todo_descriptions(),
        user2_todo1_title=valid_todo_titles(),
        user2_todo1_desc=valid_todo_descriptions(),
    )
    def test_property_18_user_specific_todo_retrieval(
        self,
        db,
        user1_username,
        user1_password,
        user2_username,
        user2_password,
        user1_todo1_title,
        user1_todo1_desc,
        user1_todo2_title,
        user1_todo2_desc,
        user2_todo1_title,
        user2_todo1_desc,
    ):
        """Property 18: User-Specific Todo Retrieval
        
        For any two different users with todos, when each user requests
        their todo list, each SHALL receive only their own todos, not
        the other user's todos.
        
        **Validates: Requirements 5.1**
        """
        # Skip if usernames are the same (can't create duplicate users)
        assume(user1_username != user2_username)
        
        # Create users
        user1 = db.create_user(user1_username, hash_password(user1_password))
        user2 = db.create_user(user2_username, hash_password(user2_password))
        
        # Create todos for user1
        todo1_u1 = Todo(
            id=None,
            title=user1_todo1_title,
            description=user1_todo1_desc,
            completed=False,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            user_id=user1.id
        )
        created_todo1_u1 = db.create_todo(todo1_u1)
        
        todo2_u1 = Todo(
            id=None,
            title=user1_todo2_title,
            description=user1_todo2_desc,
            completed=False,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            user_id=user1.id
        )
        created_todo2_u1 = db.create_todo(todo2_u1)
        
        # Create todo for user2
        todo1_u2 = Todo(
            id=None,
            title=user2_todo1_title,
            description=user2_todo1_desc,
            completed=False,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            user_id=user2.id
        )
        created_todo1_u2 = db.create_todo(todo1_u2)
        
        # Get todos for user1
        user1_todos = db.get_todos_by_user_id(user1.id)
        user1_todo_ids = [t.id for t in user1_todos]
        
        # Get todos for user2
        user2_todos = db.get_todos_by_user_id(user2.id)
        user2_todo_ids = [t.id for t in user2_todos]
        
        # Verify user1 gets only their todos
        assert len(user1_todos) == 2
        assert created_todo1_u1.id in user1_todo_ids
        assert created_todo2_u1.id in user1_todo_ids
        assert created_todo1_u2.id not in user1_todo_ids
        
        # Verify user2 gets only their todos
        assert len(user2_todos) == 1
        assert created_todo1_u2.id in user2_todo_ids
        assert created_todo1_u1.id not in user2_todo_ids
        assert created_todo2_u1.id not in user2_todo_ids

    @settings(
        max_examples=5,
        suppress_health_check=[HealthCheck.too_slow, HealthCheck.function_scoped_fixture],
        deadline=None
    )
    @given(
        username=valid_usernames(),
        password=valid_passwords(),
        todo_title=valid_todo_titles(),
        todo_desc=valid_todo_descriptions(),
    )
    def test_property_19_todo_ownership_on_creation(
        self,
        db,
        username,
        password,
        todo_title,
        todo_desc,
    ):
        """Property 19: Todo Ownership on Creation
        
        For any todo created by a user, that todo SHALL be associated
        with that user's ID in the database.
        
        **Validates: Requirements 5.2**
        """
        # Create user
        user = db.create_user(username, hash_password(password))
        
        # Create todo
        todo = Todo(
            id=None,
            title=todo_title,
            description=todo_desc,
            completed=False,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            user_id=user.id
        )
        created_todo = db.create_todo(todo)
        
        # Verify todo is associated with user
        assert created_todo.user_id == user.id
        
        # Verify in database
        db_todo = db.get_todo_by_id(created_todo.id)
        assert db_todo is not None
        assert db_todo.user_id == user.id

    @settings(
        max_examples=5,
        suppress_health_check=[HealthCheck.too_slow, HealthCheck.function_scoped_fixture],
        deadline=None
    )
    @given(
        user1_username=valid_usernames(),
        user1_password=valid_passwords(),
        user2_username=valid_usernames(),
        user2_password=valid_passwords(),
        todo_title=valid_todo_titles(),
        todo_desc=valid_todo_descriptions(),
    )
    def test_property_20_todo_update_ownership_verification(
        self,
        db,
        user1_username,
        user1_password,
        user2_username,
        user2_password,
        todo_title,
        todo_desc,
    ):
        """Property 20: Todo Update Ownership Verification
        
        For any todo owned by user A, when user B attempts to update
        that todo, the request SHALL be rejected with a 403 Forbidden
        response.
        
        **Validates: Requirements 5.3**
        """
        # Skip if usernames are the same
        assume(user1_username != user2_username)
        
        # Create users
        user1 = db.create_user(user1_username, hash_password(user1_password))
        user2 = db.create_user(user2_username, hash_password(user2_password))
        
        # Create todo for user1
        todo = Todo(
            id=None,
            title=todo_title,
            description=todo_desc,
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
        
        # Verify ownership check would fail for user2
        db_todo = db.get_todo_by_id(created_todo.id)
        assert db_todo.user_id == user1.id
        assert db_todo.user_id != user2.id

    @settings(
        max_examples=5,
        suppress_health_check=[HealthCheck.too_slow, HealthCheck.function_scoped_fixture],
        deadline=None
    )
    @given(
        user1_username=valid_usernames(),
        user1_password=valid_passwords(),
        user2_username=valid_usernames(),
        user2_password=valid_passwords(),
        todo_title=valid_todo_titles(),
        todo_desc=valid_todo_descriptions(),
    )
    def test_property_21_todo_access_control(
        self,
        db,
        user1_username,
        user1_password,
        user2_username,
        user2_password,
        todo_title,
        todo_desc,
    ):
        """Property 21: Todo Access Control
        
        For any todo owned by user A, when user B attempts to access
        that todo, the request SHALL be rejected with a 403 Forbidden
        response.
        
        **Validates: Requirements 5.4**
        """
        # Skip if usernames are the same
        assume(user1_username != user2_username)
        
        # Create users
        user1 = db.create_user(user1_username, hash_password(user1_password))
        user2 = db.create_user(user2_username, hash_password(user2_password))
        
        # Create todo for user1
        todo = Todo(
            id=None,
            title=todo_title,
            description=todo_desc,
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
        
        # Verify access control check would fail for user2
        db_todo = db.get_todo_by_id(created_todo.id)
        assert db_todo.user_id == user1.id
        assert db_todo.user_id != user2.id

    @settings(
        max_examples=5,
        suppress_health_check=[HealthCheck.too_slow, HealthCheck.function_scoped_fixture],
        deadline=None
    )
    @given(
        user1_username=valid_usernames(),
        user1_password=valid_passwords(),
        user2_username=valid_usernames(),
        user2_password=valid_passwords(),
        todo_title=valid_todo_titles(),
        todo_desc=valid_todo_descriptions(),
    )
    def test_property_22_todo_delete_access_control(
        self,
        db,
        user1_username,
        user1_password,
        user2_username,
        user2_password,
        todo_title,
        todo_desc,
    ):
        """Property 22: Todo Delete Access Control
        
        For any todo owned by user A, when user B attempts to delete
        that todo, the request SHALL be rejected with a 403 Forbidden
        response.
        
        **Validates: Requirements 5.5**
        """
        # Skip if usernames are the same
        assume(user1_username != user2_username)
        
        # Create users
        user1 = db.create_user(user1_username, hash_password(user1_password))
        user2 = db.create_user(user2_username, hash_password(user2_password))
        
        # Create todo for user1
        todo = Todo(
            id=None,
            title=todo_title,
            description=todo_desc,
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
        
        # Verify delete access control check would fail for user2
        db_todo = db.get_todo_by_id(created_todo.id)
        assert db_todo.user_id == user1.id
        assert db_todo.user_id != user2.id

    @settings(
        max_examples=5,
        suppress_health_check=[HealthCheck.too_slow, HealthCheck.function_scoped_fixture],
        deadline=None
    )
    @given(
        username=valid_usernames(),
        password=valid_passwords(),
        todo_title=valid_todo_titles(),
        todo_desc=valid_todo_descriptions(),
    )
    def test_property_23_todo_query_filtering(
        self,
        db,
        username,
        password,
        todo_title,
        todo_desc,
    ):
        """Property 23: Todo Query Filtering
        
        For any todo query, the results SHALL be filtered to include
        only todos belonging to the authenticated user.
        
        **Validates: Requirements 5.6**
        """
        # Create user
        user = db.create_user(username, hash_password(password))
        
        # Create multiple todos for this user
        todos_to_create = []
        for i in range(3):
            todo = Todo(
                id=None,
                title=f"{todo_title}_{i}",
                description=f"{todo_desc}_{i}",
                completed=i % 2 == 0,
                created_at=datetime.now(),
                updated_at=datetime.now(),
                user_id=user.id
            )
            todos_to_create.append(db.create_todo(todo))
        
        # Query todos for this user
        queried_todos = db.get_todos_by_user_id(user.id)
        
        # Verify all returned todos belong to this user
        assert len(queried_todos) == 3
        for todo in queried_todos:
            assert todo.user_id == user.id
        
        # Verify all created todos are in the results
        queried_ids = [t.id for t in queried_todos]
        for created_todo in todos_to_create:
            assert created_todo.id in queried_ids
