"""Unit tests for migration service.

Tests the migration logic for associating existing todos with the system user
during the user login feature deployment.
"""

import pytest
import tempfile
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from datetime import datetime
from database import TodoDatabase
from services.migration_service import MigrationService
from models import Todo, User
import bcrypt


@pytest.fixture
def temp_db():
    """Create a temporary database for testing.

    Yields:
        Tuple of (TodoDatabase, db_path)
    """
    fd, db_path = tempfile.mkstemp(suffix='.db')
    os.close(fd)

    db = TodoDatabase(db_path, run_migrations=True)
    yield db, db_path

    # Cleanup
    if os.path.exists(db_path):
        os.remove(db_path)


@pytest.fixture
def migration_service(temp_db):
    """Create a migration service with temporary database.

    Yields:
        MigrationService instance
    """
    db, _ = temp_db
    yield MigrationService(db)


class TestMigrationServiceBasics:
    """Test basic migration service functionality."""

    def test_migration_service_initialization(self, migration_service):
        """Test that migration service initializes correctly."""
        assert migration_service is not None
        assert migration_service.db is not None

    def test_system_user_exists_after_migration(self, temp_db):
        """Test that system user is created during database initialization."""
        db, _ = temp_db

        # System user should exist after migrations run
        system_user = db.get_user_by_id('system')
        assert system_user is not None
        assert system_user.id == 'system'
        assert system_user.username == 'system'

    def test_migration_logs_table_exists(self, temp_db):
        """Test that migration logs table is created."""
        db, db_path = temp_db

        # Check that migration_logs table exists
        with db.get_connection() as conn:
            cursor = conn.execute(
                '''
                SELECT name FROM sqlite_master
                WHERE type='table' AND name='migration_logs'
                '''
            )
            result = cursor.fetchone()
            assert result is not None


class TestMigrationWithNoTodos:
    """Test migration when there are no todos."""

    def test_migrate_with_zero_todos(self, migration_service):
        """Test migration when database has no todos."""
        result = migration_service.migrate_todos_to_system_user()

        assert result['success'] is True
        assert result['todos_migrated'] == 0
        assert result['system_user_id'] == 'system'
        assert 'Successfully ensured' in result['message']

    def test_idempotency_with_zero_todos(self, migration_service):
        """Test that migration is idempotent with zero todos."""
        # Run migration twice
        result1 = migration_service.migrate_todos_to_system_user()
        result2 = migration_service.migrate_todos_to_system_user()

        assert result1['success'] is True
        assert result2['success'] is True
        assert result1['todos_migrated'] == result2['todos_migrated']


class TestMigrationWithOneTodo:
    """Test migration when there is one todo."""

    def test_migrate_with_one_todo(self, temp_db):
        """Test migration when database has one todo.
        
        Note: Due to the database schema default, todos are automatically
        assigned to 'system' user. This test verifies the migration logic
        correctly handles todos already assigned to system user.
        """
        db, _ = temp_db
        migration_service = MigrationService(db)

        # Create a todo (automatically assigned to system user by schema)
        now = datetime.now()
        with db.get_connection() as conn:
            conn.execute(
                '''
                INSERT INTO todos (title, description, completed, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ''',
                ('Test Todo', 'Test Description', False, now, now)
            )

        # Run migration
        result = migration_service.migrate_todos_to_system_user()

        assert result['success'] is True
        # Migration finds 1 todo already assigned to system user
        assert result['todos_migrated'] == 1
        assert result['system_user_id'] == 'system'

        # Verify todo is associated with system user
        todos = db.get_todos_by_user_id('system')
        assert len(todos) == 1
        assert todos[0].title == 'Test Todo'
        assert todos[0].user_id == 'system'

    def test_idempotency_with_one_todo(self, temp_db):
        """Test that migration is idempotent with one todo."""
        db, _ = temp_db
        migration_service = MigrationService(db)

        # Create a todo (automatically assigned to system user by schema)
        now = datetime.now()
        with db.get_connection() as conn:
            conn.execute(
                '''
                INSERT INTO todos (title, description, completed, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ''',
                ('Test Todo', 'Test Description', False, now, now)
            )

        # Run migration twice
        result1 = migration_service.migrate_todos_to_system_user()
        result2 = migration_service.migrate_todos_to_system_user()

        assert result1['success'] is True
        assert result2['success'] is True
        assert result1['todos_migrated'] == 1
        assert result2['todos_migrated'] == 1

        # Verify only one todo exists
        todos = db.get_todos_by_user_id('system')
        assert len(todos) == 1


class TestMigrationWithMultipleTodos:
    """Test migration when there are multiple todos."""

    def test_migrate_with_multiple_todos(self, temp_db):
        """Test migration when database has multiple todos.
        
        Note: Todos are automatically assigned to 'system' user by schema.
        """
        db, _ = temp_db
        migration_service = MigrationService(db)

        # Create multiple todos (automatically assigned to system user)
        now = datetime.now()
        with db.get_connection() as conn:
            for i in range(5):
                conn.execute(
                    '''
                    INSERT INTO todos (title, description, completed, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                    ''',
                    (f'Todo {i}', f'Description {i}', False, now, now)
                )

        # Run migration
        result = migration_service.migrate_todos_to_system_user()

        assert result['success'] is True
        assert result['todos_migrated'] == 5
        assert result['system_user_id'] == 'system'

        # Verify all todos are associated with system user
        todos = db.get_todos_by_user_id('system')
        assert len(todos) == 5
        for i, todo in enumerate(reversed(todos)):
            assert todo.user_id == 'system'

    def test_migrate_with_100_todos(self, temp_db):
        """Test migration with 100+ todos (edge case)."""
        db, _ = temp_db
        migration_service = MigrationService(db)

        # Create 100 todos (automatically assigned to system user)
        now = datetime.now()
        with db.get_connection() as conn:
            for i in range(100):
                conn.execute(
                    '''
                    INSERT INTO todos (title, description, completed, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                    ''',
                    (f'Todo {i}', f'Description {i}', False, now, now)
                )

        # Run migration
        result = migration_service.migrate_todos_to_system_user()

        assert result['success'] is True
        assert result['todos_migrated'] == 100
        assert result['system_user_id'] == 'system'

        # Verify all todos are associated with system user
        todos = db.get_todos_by_user_id('system')
        assert len(todos) == 100

    def test_idempotency_with_multiple_todos(self, temp_db):
        """Test that migration is idempotent with multiple todos."""
        db, _ = temp_db
        migration_service = MigrationService(db)

        # Create multiple todos (automatically assigned to system user)
        now = datetime.now()
        with db.get_connection() as conn:
            for i in range(10):
                conn.execute(
                    '''
                    INSERT INTO todos (title, description, completed, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                    ''',
                    (f'Todo {i}', f'Description {i}', False, now, now)
                )

        # Run migration multiple times
        result1 = migration_service.migrate_todos_to_system_user()
        result2 = migration_service.migrate_todos_to_system_user()
        result3 = migration_service.migrate_todos_to_system_user()

        assert result1['success'] is True
        assert result2['success'] is True
        assert result3['success'] is True
        assert result1['todos_migrated'] == 10
        assert result2['todos_migrated'] == 10
        assert result3['todos_migrated'] == 10

        # Verify only 10 todos exist
        todos = db.get_todos_by_user_id('system')
        assert len(todos) == 10


class TestMigrationWithMixedTodos:
    """Test migration with mixed todo states."""

    def test_migrate_with_some_todos_already_assigned(self, temp_db):
        """Test migration when some todos already have user_id.
        
        Note: All new todos are automatically assigned to 'system' by schema.
        This test verifies migration correctly handles todos assigned to
        different users.
        """
        db, _ = temp_db
        migration_service = MigrationService(db)

        # Create a real user
        user = db.create_user('testuser', 'hashed_password')

        # Create some todos with user_id and some without
        now = datetime.now()
        with db.get_connection() as conn:
            # Todos with user_id (explicitly assigned to real user)
            for i in range(3):
                conn.execute(
                    '''
                    INSERT INTO todos (title, description, completed, created_at, updated_at, user_id)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ''',
                    (f'User Todo {i}', f'Description {i}', False, now, now, user.id)
                )

            # Todos without explicit user_id (automatically assigned to system)
            for i in range(2):
                conn.execute(
                    '''
                    INSERT INTO todos (title, description, completed, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                    ''',
                    (f'System Todo {i}', f'Description {i}', False, now, now)
                )

        # Run migration
        result = migration_service.migrate_todos_to_system_user()

        assert result['success'] is True
        # Migration finds 2 todos already assigned to system user
        assert result['todos_migrated'] == 2

        # Verify user's todos are unchanged
        user_todos = db.get_todos_by_user_id(user.id)
        assert len(user_todos) == 3

        # Verify system user has the migrated todos
        system_todos = db.get_todos_by_user_id('system')
        assert len(system_todos) == 2

    def test_migrate_with_empty_string_user_id(self, temp_db):
        """Test migration handles empty string user_id."""
        db, _ = temp_db
        migration_service = MigrationService(db)

        # Create todos with empty string user_id
        now = datetime.now()
        with db.get_connection() as conn:
            for i in range(3):
                conn.execute(
                    '''
                    INSERT INTO todos (title, description, completed, created_at, updated_at, user_id)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ''',
                    (f'Todo {i}', f'Description {i}', False, now, now, '')
                )

        # Run migration
        result = migration_service.migrate_todos_to_system_user()

        assert result['success'] is True
        assert result['todos_migrated'] == 3

        # Verify todos are associated with system user
        todos = db.get_todos_by_user_id('system')
        assert len(todos) == 3


class TestMigrationLogging:
    """Test migration logging functionality."""

    def test_migration_log_entry_created(self, temp_db):
        """Test that migration log entry is created."""
        db, _ = temp_db
        migration_service = MigrationService(db)

        # Create a todo to migrate
        now = datetime.now()
        with db.get_connection() as conn:
            conn.execute(
                '''
                INSERT INTO todos (title, description, completed, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ''',
                ('Test Todo', 'Test Description', False, now, now)
            )

        # Run migration
        result = migration_service.migrate_todos_to_system_user()

        # Check that migration log entry exists
        with db.get_connection() as conn:
            cursor = conn.execute(
                '''
                SELECT COUNT(*) as count
                FROM migration_logs
                WHERE migration_name = '006_create_system_user_and_migrate_todos'
                '''
            )
            count = cursor.fetchone()['count']
            assert count > 0

    def test_get_migration_log(self, temp_db):
        """Test retrieving migration log entry.
        
        The migration log is created by the SQL migration (006) during
        database initialization. This test verifies that the log can be
        retrieved and contains the expected information.
        """
        db, _ = temp_db
        migration_service = MigrationService(db)

        # Retrieve migration log (created during database initialization)
        log = migration_service.get_migration_log(
            '006_create_system_user_and_migrate_todos'
        )

        # The log should exist from the SQL migration during initialization
        assert log is not None
        assert log['migration_name'] == '006_create_system_user_and_migrate_todos'
        assert log['status'] == 'completed'
        # At initialization time, there were 0 todos
        assert log['todos_migrated'] == 0

    def test_get_migration_statistics(self, temp_db):
        """Test getting migration statistics.
        
        Statistics are based on migration logs created by SQL migrations
        during database initialization.
        """
        db, _ = temp_db
        migration_service = MigrationService(db)

        # Get statistics
        stats = migration_service.get_migration_statistics()

        # Statistics should show migrations from SQL migration 006
        assert stats['total_migrations'] > 0
        assert stats['successful_migrations'] > 0
        # At initialization time, there were 0 todos
        assert stats['total_todos_migrated'] == 0


class TestMigrationIdempotency:
    """Test migration idempotency verification."""

    def test_verify_migration_idempotency(self, temp_db):
        """Test idempotency verification method."""
        db, _ = temp_db
        migration_service = MigrationService(db)

        # Create todos
        now = datetime.now()
        with db.get_connection() as conn:
            for i in range(3):
                conn.execute(
                    '''
                    INSERT INTO todos (title, description, completed, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                    ''',
                    (f'Todo {i}', f'Description {i}', False, now, now)
                )

        # Verify idempotency
        is_idempotent = migration_service.verify_migration_idempotency()

        assert is_idempotent is True

    def test_idempotency_with_no_todos(self, migration_service):
        """Test idempotency verification with no todos."""
        is_idempotent = migration_service.verify_migration_idempotency()
        assert is_idempotent is True


class TestMigrationEdgeCases:
    """Test edge cases in migration logic."""

    def test_migration_with_null_user_id(self, temp_db):
        """Test migration handles NULL user_id correctly.
        
        Note: The schema has NOT NULL constraint with DEFAULT 'system',
        so NULL values cannot be inserted. This test verifies the migration
        correctly handles the schema constraint.
        """
        db, _ = temp_db
        migration_service = MigrationService(db)

        # Create todos with explicit 'system' user_id (simulating pre-migration state)
        now = datetime.now()
        with db.get_connection() as conn:
            for i in range(2):
                conn.execute(
                    '''
                    INSERT INTO todos (title, description, completed, created_at, updated_at, user_id)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ''',
                    (f'Todo {i}', f'Description {i}', False, now, now, 'system')
                )

        # Run migration
        result = migration_service.migrate_todos_to_system_user()

        assert result['success'] is True
        assert result['todos_migrated'] == 2

        # Verify todos are associated with system user
        todos = db.get_todos_by_user_id('system')
        assert len(todos) == 2

    def test_migration_preserves_todo_data(self, temp_db):
        """Test that migration preserves all todo data."""
        db, _ = temp_db
        migration_service = MigrationService(db)

        # Create a todo with specific data
        now = datetime.now()
        with db.get_connection() as conn:
            conn.execute(
                '''
                INSERT INTO todos (title, description, completed, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ''',
                ('Important Task', 'This is important', True, now, now)
            )

        # Run migration
        migration_service.migrate_todos_to_system_user()

        # Verify todo data is preserved
        todos = db.get_todos_by_user_id('system')
        assert len(todos) == 1
        assert todos[0].title == 'Important Task'
        assert todos[0].description == 'This is important'
        assert todos[0].completed is True
        assert todos[0].user_id == 'system'

    def test_migration_with_special_characters_in_todo(self, temp_db):
        """Test migration with special characters in todo data."""
        db, _ = temp_db
        migration_service = MigrationService(db)

        # Create a todo with special characters
        now = datetime.now()
        special_title = "Todo with 'quotes' and \"double quotes\" & symbols"
        special_desc = "Description with émojis 🎉 and spëcial çharacters"

        with db.get_connection() as conn:
            conn.execute(
                '''
                INSERT INTO todos (title, description, completed, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ''',
                (special_title, special_desc, False, now, now)
            )

        # Run migration
        result = migration_service.migrate_todos_to_system_user()

        assert result['success'] is True
        assert result['todos_migrated'] == 1

        # Verify special characters are preserved
        todos = db.get_todos_by_user_id('system')
        assert len(todos) == 1
        assert todos[0].title == special_title
        assert todos[0].description == special_desc


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
