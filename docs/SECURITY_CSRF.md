# CSRF Protection Implementation

## Overview

This document describes CSRF (Cross-Site Request Forgery) protection implemented in the User Login feature.

## CSRF Attack Prevention

### How CSRF Attacks Work

```
1. User logs into bank.com
2. User visits attacker.com (in another tab)
3. Attacker.com makes request to bank.com on behalf of user
4. Browser automatically includes user's session cookie
5. Bank.com processes request thinking it's from the user
6. Attacker successfully transfers money
```

### CSRF Token Protection

```
1. User logs into bank.com
2. Bank.com generates unique CSRF token for user's session
3. Token is included in all forms and state-changing requests
4. User visits attacker.com
5. Attacker.com tries to make request to bank.com
6. Attacker doesn't have the CSRF token
7. Bank.com rejects request (403 Forbidden)
8. Attack is prevented
```

---

## Token Generation

### Cryptographic Randomness

CSRF tokens are generated using `secrets.token_urlsafe()`:

```python
import secrets

# Generate 256-bit random token
token = secrets.token_urlsafe(32)
# Result: "XyZ0123456789AbCdEfGhIjKlMnOpQrStUvWxYz_-" (~43 characters)
```

### Token Storage

Tokens are hashed before storage:

```python
import hashlib

# Hash token for storage
token_hash = hashlib.sha256(token.encode()).hexdigest()

# Store hash in database (not plaintext token)
db.create_csrf_token(session_id, token_hash, expires_at)
```

---

## Token Validation

### Per-Session Tokens

Each session has its own CSRF token:

```python
def validate_csrf_token(db, session_id, token):
    token_hash = hash_token(token)
    csrf_token = db.get_csrf_token_by_hash(token_hash)
    
    if csrf_token is None:
        return False, "Invalid CSRF token"
    
    # Verify token belongs to correct session
    if csrf_token.session_id != session_id:
        return False, "Invalid CSRF token"
    
    # Check expiration
    if datetime.now() > csrf_token.expires_at:
        return False, "CSRF token expired"
    
    return True, None
```

### Validation on State-Changing Requests

CSRF token is required for POST, PUT, DELETE requests:

```python
@app.route('/api/todos', methods=['POST'])
def create_todo():
    # Get CSRF token from request
    csrf_token = request.json.get('csrfToken') or request.headers.get('X-CSRF-Token')
    
    # Get session from cookie
    session_token = request.cookies.get('session_token')
    
    # Validate CSRF token
    is_valid, error = validate_csrf_token(db, session_id, csrf_token)
    
    if not is_valid:
        return {'error': 'CSRF validation failed'}, 403
    
    # Process request
    return create_todo_impl()
```

---

## Token Rotation

### Rotate After Each Request

CSRF token is rotated after each state-changing request:

```python
def rotate_csrf_token(db, session_id, old_token):
    # Validate old token
    is_valid, error = validate_csrf_token(db, session_id, old_token)
    
    if not is_valid:
        return False, error
    
    # Delete old token
    old_token_hash = hash_token(old_token)
    csrf_token_obj = db.get_csrf_token_by_hash(old_token_hash)
    if csrf_token_obj:
        db.delete_csrf_token(csrf_token_obj.id)
    
    # Create new token
    success, error, (new_token, csrf_token) = create_csrf_token(db, session_id)
    
    return success, error, (new_token, csrf_token)
```

**Benefits:**
- Prevents token reuse
- Limits window of vulnerability
- Ensures fresh tokens for each request

---

## Implementation Patterns

### Form Submission

```html
<form method="POST" action="/api/todos">
  <input type="hidden" name="csrfToken" value="{{ csrf_token }}">
  <input type="text" name="title" placeholder="Todo title">
  <button type="submit">Add Todo</button>
</form>
```

### API Request

```typescript
// Include CSRF token in request header
const response = await fetch('/api/todos', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken
  },
  body: JSON.stringify({ title: 'New Todo' })
});
```

### Backend Validation

```python
@app.route('/api/todos', methods=['POST'])
def create_todo():
    # Get CSRF token from request
    csrf_token = request.json.get('csrfToken') or request.headers.get('X-CSRF-Token')
    
    # Get session
    session_token = request.cookies.get('session_token')
    is_valid, error, session = validate_session_token(db, session_token)
    
    if not is_valid:
        return {'error': 'Not authenticated'}, 401
    
    # Validate CSRF token
    is_valid, error = validate_csrf_token(db, session.id, csrf_token)
    
    if not is_valid:
        return {'error': 'CSRF validation failed'}, 403
    
    # Process request
    todo = create_todo_impl(session.user_id, request.json['title'])
    
    # Rotate CSRF token
    success, error, (new_token, _) = rotate_csrf_token(db, session.id, csrf_token)
    
    return {
        'success': True,
        'todo': todo,
        'csrfToken': new_token
    }
```

---

## Double-Submit Cookie Pattern

### Alternative Implementation

```python
# Generate CSRF token
csrf_token = secrets.token_urlsafe(32)

# Set as cookie
response.set_cookie('csrf_token', csrf_token, httponly=False, samesite='Strict')

# Require in request body or header
csrf_from_request = request.json.get('csrfToken') or request.headers.get('X-CSRF-Token')
csrf_from_cookie = request.cookies.get('csrf_token')

if csrf_from_request != csrf_from_cookie:
    return {'error': 'CSRF validation failed'}, 403
```

**Note:** This approach is less secure than per-session tokens because:
- Token is stored in cookie (accessible to JavaScript if not HttpOnly)
- Token is not validated against session
- Doesn't prevent token reuse

---

## SameSite Cookie Attribute

### SameSite=Strict

Session cookies use SameSite=Strict:

```python
response.set_cookie(
    'session_token',
    token,
    samesite='Strict'  # Cookie not sent in cross-site requests
)
```

**Benefits:**
- Prevents CSRF attacks
- Cookie not sent in cross-site requests
- Only sent in same-site requests

### SameSite=Lax (Alternative)

```python
response.set_cookie(
    'session_token',
    token,
    samesite='Lax'  # Cookie sent in top-level navigation
)
```

**Trade-off:**
- Slightly less secure than Strict
- Allows cookie in top-level navigation (better UX)
- Still prevents CSRF in form submissions

---

## Testing

### Unit Tests

```python
import pytest
from csrf_protection import create_csrf_token, validate_csrf_token, rotate_csrf_token

def test_csrf_token_creation():
    success, error, (token, csrf_token) = create_csrf_token(db, "session_123")
    
    assert success
    assert token is not None
    assert csrf_token.session_id == "session_123"

def test_csrf_token_validation():
    success, error, (token, csrf_token) = create_csrf_token(db, "session_123")
    
    is_valid, error = validate_csrf_token(db, "session_123", token)
    assert is_valid

def test_csrf_token_session_mismatch():
    success, error, (token, csrf_token) = create_csrf_token(db, "session_123")
    
    # Try to use token with different session
    is_valid, error = validate_csrf_token(db, "session_456", token)
    assert not is_valid

def test_csrf_token_rotation():
    success, error, (token1, _) = create_csrf_token(db, "session_123")
    
    success, error, (token2, _) = rotate_csrf_token(db, "session_123", token1)
    
    assert success
    assert token1 != token2
    
    # Old token should be invalid
    is_valid, error = validate_csrf_token(db, "session_123", token1)
    assert not is_valid
```

---

## Configuration

### Token Duration

```python
# In csrf_protection.py
CSRF_TOKEN_DURATION_HOURS = 24  # 24-hour expiration
```

### Token Length

```python
# In csrf_protection.py
CSRF_TOKEN_LENGTH = 32  # 256 bits of entropy
```

---

## Related Documentation

- [CSRF Protection API](../backend/docs/CSRF_PROTECTION.md) - CSRF implementation
- [Password Security](SECURITY_PASSWORD.md) - Password hashing
- [Session Security](SECURITY_SESSION.md) - Session management
- [Rate Limiting](SECURITY_RATE_LIMITING.md) - Brute force protection
- [Security Best Practices](SECURITY_BEST_PRACTICES.md) - General security guidelines
