"""Property-based tests for data migration.

These tests verify that:
- Property 31: Post-Migration Todo Association

Using Hypothesis for property-based testing with minimum 5 iterations.
"""

import pytest
from hypothesis import given, strategies as st, settings, HealthCheck
from datetime import datetime
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from models import Todo
from services.auth_service import hash_password


# Hypothesis strategies for generating test data
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
def app(tmp_path):
    """Create and configure a test Flask application with a temporary database."""
    import os
    
    # Create a temporary database file for this test
    db_file = tmp_path / "test.db"
    
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


class TestMigrationProperties:
    """Property-based tests for data migration."""

    @settings(
        max_examples=5,
        suppress_health_check=[
            HealthCheck.too_slow,
            HealthCheck.function_scoped_fixture
        ],
        deadline=None
    )
    @given(
        num_todos=st.integers(min_value=0, max_value=10),
        todo_title=valid_todo_titles(),
        todo_desc=valid_todo_descriptions(),
    )
    def test_property_31_post_migration_todo_association(
        self,
        db,
        num_todos,
        todo_title,
        todo_desc,
    ):
        """Property 31: Post-Migration Todo Association

        For any todo in the database after migration, that todo SHALL
        be associated with a valid user account (either the system user
        or a real user).

        **Validates: Requirements 15.4**
        """
        # Get or create system user
        system_user = db.get_user_by_username("system")
        if system_user is None:
            system_user = db.create_user(
                "system",
                hash_password("system_password_123")
            )

        # Create multiple todos associated with system user
        created_todos = []
        for i in range(num_todos):
            todo = Todo(
                id=None,
                title=f"{todo_title}_{i}",
                description=f"{todo_desc}_{i}",
                completed=i % 2 == 0,
                created_at=datetime.now(),
                updated_at=datetime.now(),
                user_id=system_user.id
            )
            created_todo = db.create_todo(todo)
            created_todos.append(created_todo)

        # Verify all todos are associated with a valid user
        all_todos = db.get_all_todos()
        for todo in all_todos:
            # Verify todo has a user_id
            assert todo.user_id is not None

            # Verify the user exists in the database
            user = db.get_user_by_id(todo.user_id)
            assert user is not None

            # Verify the user is either system user or a real user
            assert user.username is not None
            assert len(user.username) > 0

        # Verify all created todos are in the results
        if num_todos > 0:
            assert len(all_todos) >= num_todos
            created_ids = [t.id for t in created_todos]
            for created_todo in created_todos:
                assert created_todo.id in [t.id for t in all_todos]
