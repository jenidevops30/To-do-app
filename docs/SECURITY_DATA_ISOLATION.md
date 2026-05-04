# Data Isolation Guarantees

## Overview

This document describes data isolation guarantees that ensure users can only access their own data.

## User-Specific Queries

### Todo Retrieval

All todo queries are filtered by authenticated user:

```python
@app.route('/api/todos', methods=['GET'])
@require_auth
def get_todos():
    # Get authenticated user from session
    user_id = session.user_id
    
    # Query only user's todos
    todos = db.query(Todo).filter(Todo.user_id == user_id).all()
    
    return {'todos': [t.to_dict() for t in todos]}
```

### Todo Creation

New todos are associated with authenticated user:

```python
@app.route('/api/todos', methods=['POST'])
@require_auth
def create_todo():
    user_id = session.user_id
    title = request.json.get('title')
    
    # Create todo with user_id
    todo = Todo(title=title, user_id=user_id)
    db.add(todo)
    db.commit()
    
    return {'todo': todo.to_dict()}
```

---

## Ownership Verification

### Todo Update

Verify user owns todo before updating:

```python
@app.route('/api/todos/<todo_id>', methods=['PUT'])
@require_auth
def update_todo(todo_id):
    user_id = session.user_id
    
    # Get todo
    todo = db.query(Todo).filter(Todo.id == todo_id).first()
    
    if not todo:
        return {'error': 'Todo not found'}, 404
    
    # Verify ownership
    if todo.user_id != user_id:
        return {'error': 'Forbidden'}, 403
    
    # Update todo
    todo.title = request.json.get('title')
    db.commit()
    
    return {'todo': todo.to_dict()}
```

### Todo Deletion

Verify user owns todo before deleting:

```python
@app.route('/api/todos/<todo_id>', methods=['DELETE'])
@require_auth
def delete_todo(todo_id):
    user_id = session.user_id
    
    # Get todo
    todo = db.query(Todo).filter(Todo.id == todo_id).first()
    
    if not todo:
        return {'error': 'Todo not found'}, 404
    
    # Verify ownership
    if todo.user_id != user_id:
        return {'error': 'Forbidden'}, 403
    
    # Delete todo
    db.delete(todo)
    db.commit()
    
    return {'success': True}
```

---

## Database-Level Isolation

### Foreign Key Constraints

Enforce user_id foreign key:

```sql
CREATE TABLE todos (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    user_id TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Indexes for Performance

Create indexes for efficient filtering:

```sql
CREATE INDEX idx_todos_user_id ON todos(user_id);
```

---

## Access Control Patterns

### Decorator Pattern

```python
from functools import wraps

def require_ownership(f):
    @wraps(f)
    def decorated_function(todo_id, *args, **kwargs):
        user_id = session.user_id
        
        # Get todo
        todo = db.query(Todo).filter(Todo.id == todo_id).first()
        
        if not todo:
            return {'error': 'Todo not found'}, 404
        
        # Verify ownership
        if todo.user_id != user_id:
            return {'error': 'Forbidden'}, 403
        
        # Pass todo to handler
        return f(todo, *args, **kwargs)
    
    return decorated_function

@app.route('/api/todos/<todo_id>', methods=['PUT'])
@require_auth
@require_ownership
def update_todo(todo):
    todo.title = request.json.get('title')
    db.commit()
    return {'todo': todo.to_dict()}
```

### Query Builder Pattern

```python
class TodoQuery:
    def __init__(self, db, user_id):
        self.db = db
        self.user_id = user_id
    
    def get_all(self):
        return self.db.query(Todo).filter(Todo.user_id == self.user_id).all()
    
    def get_by_id(self, todo_id):
        return self.db.query(Todo).filter(
            Todo.id == todo_id,
            Todo.user_id == self.user_id
        ).first()
    
    def create(self, title):
        todo = Todo(title=title, user_id=self.user_id)
        self.db.add(todo)
        self.db.commit()
        return todo

# Usage
@app.route('/api/todos', methods=['GET'])
@require_auth
def get_todos():
    query = TodoQuery(db, session.user_id)
    todos = query.get_all()
    return {'todos': [t.to_dict() for t in todos]}
```

---

## Testing

### Unit Tests

```python
import pytest
from database import TodoDatabase

def test_user_can_only_see_own_todos():
    db = TodoDatabase()
    
    # Create two users
    user1 = db.create_user('user1', 'hash1')
    user2 = db.create_user('user2', 'hash2')
    
    # Create todos for each user
    todo1 = db.create_todo(user1.id, 'User 1 Todo')
    todo2 = db.create_todo(user2.id, 'User 2 Todo')
    
    # User 1 should only see their todo
    user1_todos = db.get_todos_for_user(user1.id)
    assert len(user1_todos) == 1
    assert user1_todos[0].id == todo1.id
    
    # User 2 should only see their todo
    user2_todos = db.get_todos_for_user(user2.id)
    assert len(user2_todos) == 1
    assert user2_todos[0].id == todo2.id

def test_user_cannot_update_other_users_todo():
    db = TodoDatabase()
    
    # Create two users
    user1 = db.create_user('user1', 'hash1')
    user2 = db.create_user('user2', 'hash2')
    
    # Create todo for user1
    todo = db.create_todo(user1.id, 'User 1 Todo')
    
    # User 2 tries to update user 1's todo
    # Should fail or return error
    result = db.update_todo(todo.id, user2.id, 'Updated Title')
    assert result is None or result.user_id == user1.id

def test_user_cannot_delete_other_users_todo():
    db = TodoDatabase()
    
    # Create two users
    user1 = db.create_user('user1', 'hash1')
    user2 = db.create_user('user2', 'hash2')
    
    # Create todo for user1
    todo = db.create_todo(user1.id, 'User 1 Todo')
    
    # User 2 tries to delete user 1's todo
    # Should fail or return error
    result = db.delete_todo(todo.id, user2.id)
    assert result is False
    
    # Todo should still exist
    todo = db.get_todo(todo.id)
    assert todo is not None
```

### Integration Tests

```python
import pytest
from app import app

def test_user_cannot_access_other_users_todos():
    client = app.test_client()
    
    # User 1 signs up and logs in
    client.post('/api/auth/signup', json={
        'username': 'user1',
        'password': 'Password123',
        'csrfToken': 'token'
    })
    
    response = client.post('/api/auth/login', json={
        'username': 'user1',
        'password': 'Password123',
        'csrfToken': 'token'
    })
    
    # User 1 creates a todo
    response = client.post('/api/todos', json={
        'title': 'User 1 Todo',
        'csrfToken': response.json['csrfToken']
    })
    todo1_id = response.json['id']
    
    # User 1 logs out
    client.post('/api/auth/logout', json={'csrfToken': 'token'})
    
    # User 2 signs up and logs in
    client.post('/api/auth/signup', json={
        'username': 'user2',
        'password': 'Password456',
        'csrfToken': 'token'
    })
    
    response = client.post('/api/auth/login', json={
        'username': 'user2',
        'password': 'Password456',
        'csrfToken': 'token'
    })
    
    # User 2 tries to access user 1's todo
    response = client.get(f'/api/todos/{todo1_id}')
    assert response.status_code == 403
```

---

## Correctness Properties

### Property 1: User-Specific Todo Retrieval

For any authenticated user, GET /api/todos returns only todos belonging to that user.

```python
@given(user_id=st.text(), todo_count=st.integers(min_value=0, max_value=10))
def test_user_specific_todo_retrieval(user_id, todo_count):
    # Create user
    user = db.create_user(user_id, 'hash')
    
    # Create todos for user
    for i in range(todo_count):
        db.create_todo(user.id, f'Todo {i}')
    
    # Get todos for user
    todos = db.get_todos_for_user(user.id)
    
    # All todos should belong to user
    assert len(todos) == todo_count
    assert all(t.user_id == user.id for t in todos)
```

### Property 2: Todo Ownership on Creation

When a user creates a todo, it is associated with that user.

```python
@given(user_id=st.text(), title=st.text())
def test_todo_ownership_on_creation(user_id, title):
    # Create user
    user = db.create_user(user_id, 'hash')
    
    # Create todo
    todo = db.create_todo(user.id, title)
    
    # Todo should belong to user
    assert todo.user_id == user.id
```

### Property 3: Todo Access Control

A user cannot access or modify todos belonging to other users.

```python
@given(user1_id=st.text(), user2_id=st.text(), title=st.text())
def test_todo_access_control(user1_id, user2_id, title):
    assume(user1_id != user2_id)
    
    # Create two users
    user1 = db.create_user(user1_id, 'hash1')
    user2 = db.create_user(user2_id, 'hash2')
    
    # User 1 creates todo
    todo = db.create_todo(user1.id, title)
    
    # User 2 should not be able to access todo
    result = db.get_todo_for_user(todo.id, user2.id)
    assert result is None
```

---

## Related Documentation

- [Authentication Service API](../backend/docs/AUTHENTICATION_SERVICE.md) - User authentication
- [Password Security](SECURITY_PASSWORD.md) - Password hashing
- [Session Security](SECURITY_SESSION.md) - Session management
- [CSRF Protection](SECURITY_CSRF.md) - CSRF attack prevention
- [Rate Limiting](SECURITY_RATE_LIMITING.md) - Brute force protection
- [Security Best Practices](SECURITY_BEST_PRACTICES.md) - General security guidelines
