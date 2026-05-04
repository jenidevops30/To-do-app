"""Data models for the todo list application."""

from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass
class User:
    """User account data model.
    
    Attributes:
        id: Unique identifier (TEXT PRIMARY KEY)
        username: Username (3-50 chars, unique, alphanumeric + underscore)
        password_hash: Bcrypt password hash (never plaintext)
        created_at: Account creation timestamp
        updated_at: Last update timestamp
    """
    id: str
    username: str
    password_hash: str
    created_at: datetime
    updated_at: datetime

    def to_dict(self) -> dict:
        """Convert user to dictionary for JSON serialization.
        
        Returns:
            Dictionary with user fields (excluding password_hash)
        """
        return {
            'id': self.id,
            'username': self.username,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

    @staticmethod
    def from_dict(data: dict) -> 'User':
        """Create user from dictionary.
        
        Args:
            data: Dictionary with user fields
            
        Returns:
            User object created from dictionary data
        """
        return User(
            id=data['id'],
            username=data['username'],
            password_hash=data['password_hash'],
            created_at=(
                datetime.fromisoformat(data['created_at'])
                if 'created_at' in data else datetime.now()
            ),
            updated_at=(
                datetime.fromisoformat(data['updated_at'])
                if 'updated_at' in data else datetime.now()
            )
        )


@dataclass
class Session:
    """Session token data model.
    
    Attributes:
        id: Unique session identifier (TEXT PRIMARY KEY)
        user_id: Associated user ID (foreign key to users table)
        token_hash: Hash of session token (never plaintext)
        expires_at: Session expiration timestamp (24 hours from creation)
        created_at: Session creation timestamp
    """
    id: str
    user_id: str
    token_hash: str
    expires_at: datetime
    created_at: datetime

    def to_dict(self) -> dict:
        """Convert session to dictionary for JSON serialization.
        
        Returns:
            Dictionary with session fields (excluding token_hash)
        """
        return {
            'id': self.id,
            'user_id': self.user_id,
            'expires_at': self.expires_at.isoformat(),
            'created_at': self.created_at.isoformat()
        }

    @staticmethod
    def from_dict(data: dict) -> 'Session':
        """Create session from dictionary.
        
        Args:
            data: Dictionary with session fields
            
        Returns:
            Session object created from dictionary data
        """
        return Session(
            id=data['id'],
            user_id=data['user_id'],
            token_hash=data['token_hash'],
            expires_at=(
                datetime.fromisoformat(data['expires_at'])
                if 'expires_at' in data else datetime.now()
            ),
            created_at=(
                datetime.fromisoformat(data['created_at'])
                if 'created_at' in data else datetime.now()
            )
        )


@dataclass
class CSRFToken:
    """CSRF token data model.
    
    Attributes:
        id: Unique token identifier (TEXT PRIMARY KEY)
        session_id: Associated session ID (foreign key to sessions table)
        token_hash: Hash of CSRF token (never plaintext)
        expires_at: Token expiration timestamp
        created_at: Token creation timestamp
    """
    id: str
    session_id: str
    token_hash: str
    expires_at: datetime
    created_at: datetime

    def to_dict(self) -> dict:
        """Convert CSRF token to dictionary for JSON serialization.
        
        Returns:
            Dictionary with token fields (excluding token_hash)
        """
        return {
            'id': self.id,
            'session_id': self.session_id,
            'expires_at': self.expires_at.isoformat(),
            'created_at': self.created_at.isoformat()
        }

    @staticmethod
    def from_dict(data: dict) -> 'CSRFToken':
        """Create CSRF token from dictionary.
        
        Args:
            data: Dictionary with token fields
            
        Returns:
            CSRFToken object created from dictionary data
        """
        return CSRFToken(
            id=data['id'],
            session_id=data['session_id'],
            token_hash=data['token_hash'],
            expires_at=(
                datetime.fromisoformat(data['expires_at'])
                if 'expires_at' in data else datetime.now()
            ),
            created_at=(
                datetime.fromisoformat(data['created_at'])
                if 'created_at' in data else datetime.now()
            )
        )


@dataclass
class RateLimitAttempt:
    """Rate limit tracking data model.
    
    Attributes:
        id: Unique identifier (TEXT PRIMARY KEY)
        ip_address: IP address making the request
        endpoint: API endpoint being accessed
        attempt_count: Number of attempts from this IP/endpoint
        first_attempt_at: Timestamp of first attempt
        last_attempt_at: Timestamp of most recent attempt
        blocked_until: Timestamp when IP will be unblocked (None if not blocked)
    """
    id: str
    ip_address: str
    endpoint: str
    attempt_count: int
    first_attempt_at: datetime
    last_attempt_at: datetime
    blocked_until: Optional[datetime]

    def to_dict(self) -> dict:
        """Convert rate limit attempt to dictionary for JSON serialization.
        
        Returns:
            Dictionary with rate limit fields
        """
        return {
            'id': self.id,
            'ip_address': self.ip_address,
            'endpoint': self.endpoint,
            'attempt_count': self.attempt_count,
            'first_attempt_at': self.first_attempt_at.isoformat(),
            'last_attempt_at': self.last_attempt_at.isoformat(),
            'blocked_until': (
                self.blocked_until.isoformat()
                if self.blocked_until else None
            )
        }

    @staticmethod
    def from_dict(data: dict) -> 'RateLimitAttempt':
        """Create rate limit attempt from dictionary.
        
        Args:
            data: Dictionary with rate limit fields
            
        Returns:
            RateLimitAttempt object created from dictionary data
        """
        return RateLimitAttempt(
            id=data['id'],
            ip_address=data['ip_address'],
            endpoint=data['endpoint'],
            attempt_count=data.get('attempt_count', 1),
            first_attempt_at=(
                datetime.fromisoformat(data['first_attempt_at'])
                if 'first_attempt_at' in data else datetime.now()
            ),
            last_attempt_at=(
                datetime.fromisoformat(data['last_attempt_at'])
                if 'last_attempt_at' in data else datetime.now()
            ),
            blocked_until=(
                datetime.fromisoformat(data['blocked_until'])
                if data.get('blocked_until') else None
            )
        )


@dataclass
class Todo:
    """Todo item data model.
    
    Attributes:
        id: Unique identifier (None for new todos)
        title: Todo title (required, max 200 chars)
        description: Todo description (optional, max 1000 chars)
        completed: Completion status
        created_at: Creation timestamp
        updated_at: Last update timestamp
        user_id: Associated user ID (foreign key to users table)
    """
    id: Optional[int]
    title: str
    description: str
    completed: bool
    created_at: datetime
    updated_at: datetime
    user_id: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert todo to dictionary for JSON serialization.
        
        Returns:
            Dictionary with all todo fields, timestamps in ISO format
        """
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'completed': self.completed,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'user_id': self.user_id
        }

    @staticmethod
    def from_dict(data: dict) -> 'Todo':
        """Create todo from dictionary.
        
        Args:
            data: Dictionary with todo fields
            
        Returns:
            Todo object created from dictionary data
        """
        return Todo(
            id=data.get('id'),
            title=data['title'],
            description=data.get('description', ''),
            completed=data.get('completed', False),
            created_at=(
                datetime.fromisoformat(data['created_at'])
                if 'created_at' in data else datetime.now()
            ),
            updated_at=(
                datetime.fromisoformat(data['updated_at'])
                if 'updated_at' in data else datetime.now()
            ),
            user_id=data.get('user_id')
        )
