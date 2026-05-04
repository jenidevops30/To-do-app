"""Database module for SQLite connection management and schema initialization."""

import sqlite3
import logging
from typing import List, Optional
from contextlib import contextmanager
from datetime import datetime
from migration_runner import MigrationRunner


logger = logging.getLogger(__name__)


# Register datetime adapters for SQLite (Python 3.12+ compatibility)
def adapt_datetime(dt: datetime) -> str:
    """Convert datetime to ISO format string for SQLite storage."""
    return dt.isoformat()


def convert_datetime(s: bytes) -> datetime:
    """Convert ISO format string from SQLite to datetime."""
    return datetime.fromisoformat(s.decode())


sqlite3.register_adapter(datetime, adapt_datetime)
sqlite3.register_converter("TIMESTAMP", convert_datetime)


class TodoDatabase:
    """Manages SQLite database connections and operations for todos."""

    def __init__(self, db_path: str, run_migrations: bool = True):
        """Initialize database with given path and create schema if needed.
        
        Args:
            db_path: Path to SQLite database file
            run_migrations: Whether to run pending migrations (default: True)
        """
        self.db_path = db_path
        self.init_db(run_migrations=run_migrations)

    @contextmanager
    def get_connection(self):
        """Context manager for database connections with automatic commit/rollback.
        
        Yields:
            sqlite3.Connection: Database connection with row factory set
        """
        conn = sqlite3.connect(
            self.db_path,
            detect_types=sqlite3.PARSE_DECLTYPES | sqlite3.PARSE_COLNAMES
        )
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()

    def init_db(self, run_migrations: bool = True) -> None:
        """Initialize database schema with todos table and indexes.
        
        Args:
            run_migrations: Whether to run pending migrations (default: True)
        """
        # Create todos table if it doesn't exist (for backward compatibility)
        with self.get_connection() as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS todos (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT NOT NULL,
                    description TEXT,
                    completed BOOLEAN NOT NULL DEFAULT 0,
                    created_at TIMESTAMP NOT NULL,
                    updated_at TIMESTAMP NOT NULL
                )
            ''')
            
            # Create indexes for better query performance
            conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_completed 
                ON todos(completed)
            ''')
            
            conn.execute('''
                CREATE INDEX IF NOT EXISTS idx_created_at 
                ON todos(created_at DESC)
            ''')
        
        # Run migrations if enabled
        if run_migrations:
            try:
                # Get the directory where this file is located
                import os
                current_dir = os.path.dirname(os.path.abspath(__file__))
                migrations_dir = os.path.join(current_dir, 'migrations')
                runner = MigrationRunner(self.db_path, migrations_dir)
                runner.migrate()
                logger.info("Database migrations completed successfully")
            except Exception as e:
                logger.error(f"Migration failed: {str(e)}")
                raise
                raise

    def create_todo(self, todo: 'Todo') -> 'Todo':
        """Insert new todo and return with assigned ID.
        
        Args:
            todo: Todo object to insert (id will be ignored)
            
        Returns:
            Todo object with assigned ID and timestamps
        """
        from models import Todo
        
        now = datetime.now()
        with self.get_connection() as conn:
            cursor = conn.execute(
                '''
                INSERT INTO todos (title, description, completed, created_at, updated_at, user_id)
                VALUES (?, ?, ?, ?, ?, ?)
                ''',
                (todo.title, todo.description, todo.completed, now, now, todo.user_id)
            )
            todo_id = cursor.lastrowid
            
        return Todo(
            id=todo_id,
            title=todo.title,
            description=todo.description,
            completed=todo.completed,
            created_at=now,
            updated_at=now,
            user_id=todo.user_id
        )

    def get_all_todos(self) -> List['Todo']:
        """Retrieve all todos from database.
        
        Returns:
            List of all Todo objects
        """
        from models import Todo
        
        with self.get_connection() as conn:
            cursor = conn.execute(
                '''
                SELECT id, title, description, completed, created_at, updated_at, user_id
                FROM todos
                ORDER BY created_at DESC
                '''
            )
            rows = cursor.fetchall()
            
        todos = []
        for row in rows:
            todos.append(Todo(
                id=row['id'],
                title=row['title'],
                description=row['description'],
                completed=bool(row['completed']),
                created_at=row['created_at'],
                updated_at=row['updated_at'],
                user_id=row['user_id']
            ))
        
        return todos

    def get_todos_by_user_id(self, user_id: str) -> List['Todo']:
        """Retrieve all todos for a specific user.
        
        Args:
            user_id: ID of the user
            
        Returns:
            List of Todo objects belonging to the user
        """
        from models import Todo
        
        with self.get_connection() as conn:
            cursor = conn.execute(
                '''
                SELECT id, title, description, completed, created_at, updated_at, user_id
                FROM todos
                WHERE user_id = ?
                ORDER BY created_at DESC
                ''',
                (user_id,)
            )
            rows = cursor.fetchall()
            
        todos = []
        for row in rows:
            todos.append(Todo(
                id=row['id'],
                title=row['title'],
                description=row['description'],
                completed=bool(row['completed']),
                created_at=row['created_at'],
                updated_at=row['updated_at'],
                user_id=row['user_id']
            ))
        
        return todos

    def get_todo_by_id(self, todo_id: int) -> Optional['Todo']:
        """Retrieve single todo by ID.
        
        Args:
            todo_id: ID of todo to retrieve
            
        Returns:
            Todo object if found, None otherwise
        """
        from models import Todo
        
        with self.get_connection() as conn:
            cursor = conn.execute(
                '''
                SELECT id, title, description, completed, created_at, updated_at, user_id
                FROM todos
                WHERE id = ?
                ''',
                (todo_id,)
            )
            row = cursor.fetchone()
            
        if row is None:
            return None
            
        return Todo(
            id=row['id'],
            title=row['title'],
            description=row['description'],
            completed=bool(row['completed']),
            created_at=row['created_at'],
            updated_at=row['updated_at'],
            user_id=row['user_id']
        )

    def update_todo(self, todo_id: int, todo: 'Todo') -> Optional['Todo']:
        """Update existing todo.
        
        Args:
            todo_id: ID of todo to update
            todo: Todo object with updated values
            
        Returns:
            Updated Todo object if found, None otherwise
        """
        from models import Todo
        
        # First check if todo exists
        existing = self.get_todo_by_id(todo_id)
        if existing is None:
            return None
        
        now = datetime.now()
        with self.get_connection() as conn:
            conn.execute(
                '''
                UPDATE todos
                SET title = ?, description = ?, completed = ?, updated_at = ?
                WHERE id = ?
                ''',
                (todo.title, todo.description, todo.completed, now, todo_id)
            )
            
        return Todo(
            id=todo_id,
            title=todo.title,
            description=todo.description,
            completed=todo.completed,
            created_at=existing.created_at,
            updated_at=now,
            user_id=existing.user_id
        )

    def delete_todo(self, todo_id: int) -> bool:
        """Delete todo by ID.
        
        Args:
            todo_id: ID of todo to delete
            
        Returns:
            True if todo was deleted, False if not found
        """
        with self.get_connection() as conn:
            cursor = conn.execute(
                '''
                DELETE FROM todos
                WHERE id = ?
                ''',
                (todo_id,)
            )
            
        return cursor.rowcount > 0

    def create_user(self, username: str, password_hash: str) -> 'User':
        """Create a new user account.
        
        Args:
            username: Username (3-50 chars, unique)
            password_hash: Bcrypt password hash
            
        Returns:
            User object with assigned ID and timestamps
        """
        from models import User
        import uuid
        
        user_id = str(uuid.uuid4())
        now = datetime.now()
        
        with self.get_connection() as conn:
            conn.execute(
                '''
                INSERT INTO users (id, username, password_hash, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ''',
                (user_id, username, password_hash, now, now)
            )
        
        return User(
            id=user_id,
            username=username,
            password_hash=password_hash,
            created_at=now,
            updated_at=now
        )

    def get_user_by_username(self, username: str) -> Optional['User']:
        """Retrieve user by username.
        
        Args:
            username: Username to look up
            
        Returns:
            User object if found, None otherwise
        """
        from models import User
        
        with self.get_connection() as conn:
            cursor = conn.execute(
                '''
                SELECT id, username, password_hash, created_at, updated_at
                FROM users
                WHERE username = ?
                ''',
                (username,)
            )
            row = cursor.fetchone()
        
        if row is None:
            return None
        
        return User(
            id=row['id'],
            username=row['username'],
            password_hash=row['password_hash'],
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )

    def get_user_by_id(self, user_id: str) -> Optional['User']:
        """Retrieve user by ID.
        
        Args:
            user_id: User ID to look up
            
        Returns:
            User object if found, None otherwise
        """
        from models import User
        
        with self.get_connection() as conn:
            cursor = conn.execute(
                '''
                SELECT id, username, password_hash, created_at, updated_at
                FROM users
                WHERE id = ?
                ''',
                (user_id,)
            )
            row = cursor.fetchone()
        
        if row is None:
            return None
        
        return User(
            id=row['id'],
            username=row['username'],
            password_hash=row['password_hash'],
            created_at=row['created_at'],
            updated_at=row['updated_at']
        )

    def create_session(
        self,
        user_id: str,
        token_hash: str,
        expires_at: datetime
    ) -> 'Session':
        """Create a new session for a user.
        
        Args:
            user_id: User ID for session
            token_hash: Hashed session token
            expires_at: Session expiration timestamp
            
        Returns:
            Session object with assigned ID
        """
        from models import Session
        import uuid
        
        session_id = str(uuid.uuid4())
        now = datetime.now()
        
        with self.get_connection() as conn:
            conn.execute(
                '''
                INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
                VALUES (?, ?, ?, ?, ?)
                ''',
                (session_id, user_id, token_hash, expires_at, now)
            )
        
        return Session(
            id=session_id,
            user_id=user_id,
            token_hash=token_hash,
            expires_at=expires_at,
            created_at=now
        )

    def get_session_by_token_hash(self, token_hash: str) -> Optional['Session']:
        """Retrieve session by token hash.
        
        Args:
            token_hash: Hashed session token
            
        Returns:
            Session object if found, None otherwise
        """
        from models import Session
        
        with self.get_connection() as conn:
            cursor = conn.execute(
                '''
                SELECT id, user_id, token_hash, expires_at, created_at
                FROM sessions
                WHERE token_hash = ?
                ''',
                (token_hash,)
            )
            row = cursor.fetchone()
        
        if row is None:
            return None
        
        return Session(
            id=row['id'],
            user_id=row['user_id'],
            token_hash=row['token_hash'],
            expires_at=row['expires_at'],
            created_at=row['created_at']
        )

    def delete_session(self, session_id: str) -> bool:
        """Delete a session by ID.
        
        Args:
            session_id: Session ID to delete
            
        Returns:
            True if session was deleted, False if not found
        """
        with self.get_connection() as conn:
            cursor = conn.execute(
                '''
                DELETE FROM sessions
                WHERE id = ?
                ''',
                (session_id,)
            )
        
        return cursor.rowcount > 0

    def create_csrf_token(
        self,
        session_id: str,
        token_hash: str,
        expires_at: datetime
    ) -> 'CSRFToken':
        """Create a new CSRF token for a session.
        
        Args:
            session_id: Session ID for CSRF token
            token_hash: Hashed CSRF token
            expires_at: Token expiration timestamp
            
        Returns:
            CSRFToken object with assigned ID
        """
        from models import CSRFToken
        import uuid
        
        token_id = str(uuid.uuid4())
        now = datetime.now()
        
        with self.get_connection() as conn:
            conn.execute(
                '''
                INSERT INTO csrf_tokens (id, session_id, token_hash, expires_at, created_at)
                VALUES (?, ?, ?, ?, ?)
                ''',
                (token_id, session_id, token_hash, expires_at, now)
            )
        
        return CSRFToken(
            id=token_id,
            session_id=session_id,
            token_hash=token_hash,
            expires_at=expires_at,
            created_at=now
        )

    def get_csrf_token_by_hash(self, token_hash: str) -> Optional['CSRFToken']:
        """Retrieve CSRF token by hash.
        
        Args:
            token_hash: Hashed CSRF token
            
        Returns:
            CSRFToken object if found, None otherwise
        """
        from models import CSRFToken
        
        with self.get_connection() as conn:
            cursor = conn.execute(
                '''
                SELECT id, session_id, token_hash, expires_at, created_at
                FROM csrf_tokens
                WHERE token_hash = ?
                ''',
                (token_hash,)
            )
            row = cursor.fetchone()
        
        if row is None:
            return None
        
        return CSRFToken(
            id=row['id'],
            session_id=row['session_id'],
            token_hash=row['token_hash'],
            expires_at=row['expires_at'],
            created_at=row['created_at']
        )

    def delete_csrf_token(self, token_id: str) -> bool:
        """Delete a CSRF token by ID.
        
        Args:
            token_id: CSRF token ID to delete
            
        Returns:
            True if token was deleted, False if not found
        """
        with self.get_connection() as conn:
            cursor = conn.execute(
                '''
                DELETE FROM csrf_tokens
                WHERE id = ?
                ''',
                (token_id,)
            )
        
        return cursor.rowcount > 0

    def create_rate_limit_attempt(
        self,
        ip_address: str,
        endpoint: str,
        first_attempt_at: datetime
    ) -> 'RateLimitAttempt':
        """Create a new rate limit tracking record.
        
        Args:
            ip_address: IP address making the request
            endpoint: API endpoint being accessed
            first_attempt_at: Timestamp of first attempt
            
        Returns:
            RateLimitAttempt object with assigned ID
        """
        from models import RateLimitAttempt
        import uuid
        
        attempt_id = str(uuid.uuid4())
        now = datetime.now()
        
        with self.get_connection() as conn:
            conn.execute(
                '''
                INSERT INTO rate_limit_attempts
                (id, ip_address, endpoint, attempt_count, first_attempt_at, last_attempt_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ''',
                (attempt_id, ip_address, endpoint, 1, first_attempt_at, now)
            )
        
        return RateLimitAttempt(
            id=attempt_id,
            ip_address=ip_address,
            endpoint=endpoint,
            attempt_count=1,
            first_attempt_at=first_attempt_at,
            last_attempt_at=now,
            blocked_until=None
        )

    def get_rate_limit_attempt(
        self,
        ip_address: str,
        endpoint: str
    ) -> Optional['RateLimitAttempt']:
        """Retrieve rate limit tracking record.
        
        Args:
            ip_address: IP address to look up
            endpoint: API endpoint
            
        Returns:
            RateLimitAttempt object if found, None otherwise
        """
        from models import RateLimitAttempt
        
        with self.get_connection() as conn:
            cursor = conn.execute(
                '''
                SELECT id, ip_address, endpoint, attempt_count,
                       first_attempt_at, last_attempt_at, blocked_until
                FROM rate_limit_attempts
                WHERE ip_address = ? AND endpoint = ?
                ''',
                (ip_address, endpoint)
            )
            row = cursor.fetchone()
        
        if row is None:
            return None
        
        return RateLimitAttempt(
            id=row['id'],
            ip_address=row['ip_address'],
            endpoint=row['endpoint'],
            attempt_count=row['attempt_count'],
            first_attempt_at=row['first_attempt_at'],
            last_attempt_at=row['last_attempt_at'],
            blocked_until=row['blocked_until']
        )

    def update_rate_limit_attempt(
        self,
        ip_address: str,
        endpoint: str,
        attempt_count: Optional[int] = None,
        blocked_until: Optional[datetime] = 'NOT_PROVIDED'
    ) -> bool:
        """Update a rate limit tracking record.
        
        Args:
            ip_address: IP address to update
            endpoint: API endpoint
            attempt_count: New attempt count (optional)
            blocked_until: New block expiration (optional, use None to clear)
            
        Returns:
            True if record was updated, False if not found
        """
        now = datetime.now()
        
        with self.get_connection() as conn:
            # Handle case where blocked_until is explicitly set to None
            if (attempt_count is not None and 
                    blocked_until != 'NOT_PROVIDED'):
                conn.execute(
                    '''
                    UPDATE rate_limit_attempts
                    SET attempt_count = ?, blocked_until = ?, last_attempt_at = ?
                    WHERE ip_address = ? AND endpoint = ?
                    ''',
                    (attempt_count, blocked_until, now, ip_address, endpoint)
                )
            elif attempt_count is not None:
                conn.execute(
                    '''
                    UPDATE rate_limit_attempts
                    SET attempt_count = ?, last_attempt_at = ?
                    WHERE ip_address = ? AND endpoint = ?
                    ''',
                    (attempt_count, now, ip_address, endpoint)
                )
            elif blocked_until != 'NOT_PROVIDED':
                conn.execute(
                    '''
                    UPDATE rate_limit_attempts
                    SET blocked_until = ?, last_attempt_at = ?
                    WHERE ip_address = ? AND endpoint = ?
                    ''',
                    (blocked_until, now, ip_address, endpoint)
                )
            else:
                conn.execute(
                    '''
                    UPDATE rate_limit_attempts
                    SET last_attempt_at = ?
                    WHERE ip_address = ? AND endpoint = ?
                    ''',
                    (now, ip_address, endpoint)
                )
            
            return conn.total_changes > 0


    def update_session_expiration(
        self,
        session_id: str,
        expires_at: datetime
    ) -> bool:
        """Update session expiration time.
        
        Args:
            session_id: Session ID to update
            expires_at: New expiration timestamp
            
        Returns:
            True if session was updated, False if not found
        """
        with self.get_connection() as conn:
            cursor = conn.execute(
                '''
                UPDATE sessions
                SET expires_at = ?
                WHERE id = ?
                ''',
                (expires_at, session_id)
            )
        
        return cursor.rowcount > 0

    def update_csrf_token_expiration(
        self,
        token_id: str,
        expires_at: datetime
    ) -> bool:
        """Update CSRF token expiration time.
        
        Args:
            token_id: CSRF token ID to update
            expires_at: New expiration timestamp
            
        Returns:
            True if token was updated, False if not found
        """
        with self.get_connection() as conn:
            cursor = conn.execute(
                '''
                UPDATE csrf_tokens
                SET expires_at = ?
                WHERE id = ?
                ''',
                (expires_at, token_id)
            )
        
        return cursor.rowcount > 0
