# Session Security Practices

## Overview

This document describes session security practices implemented in the User Login feature.

## Session Token Generation

### Cryptographic Randomness

Session tokens are generated using `secrets.token_urlsafe()`:

```python
import secrets

# Generate 256-bit random token
token = secrets.token_urlsafe(32)
# Result: "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-" (~43 characters)
```

**Security Properties:**
- Uses cryptographically secure random number generator
- 256 bits of entropy (32 bytes)
- URL-safe encoding (base64)
- Unique for each session

### Token Storage

Tokens are hashed before storage:

```python
import hashlib

# Hash token for storage
token_hash = hashlib.sha256(token.encode()).hexdigest()

# Store hash in database (not plaintext token)
db.create_session(user_id, token_hash, expires_at)
```

**Benefits:**
- If database is compromised, tokens cannot be used directly
- One-way function (cannot reverse hash to get token)
- Prevents token reuse if database is leaked

---

## Session Expiration

### 24-Hour Expiration

Sessions expire after 24 hours:

```python
from datetime import datetime, timedelta

# Create session with 24-hour expiration
now = datetime.now()
expires_at = now + timedelta(hours=24)

db.create_session(user_id, token_hash, expires_at)
```

**Rationale:**
- Balances security and usability
- Limits window of vulnerability if token is compromised
- Allows users to stay logged in during normal usage
- Requires re-authentication after extended absence

### Expiration Checking

Expiration is checked on every request:

```python
def validate_session_token(db, token):
    token_hash = hash_token(token)
    session = db.get_session_by_token_hash(token_hash)
    
    if session is None:
        return False, "Invalid token"
    
    # Check expiration
    now = datetime.now()
    if now > session.expires_at:
        return False, "Session expired"
    
    return True, None
```

---

## Cookie Security

### HTTP-Only Flag

Session cookies are HTTP-only (not accessible to JavaScript):

```python
# In Flask
app.config['SESSION_COOKIE_HTTPONLY'] = True
```

**Benefits:**
- Prevents JavaScript from accessing session token
- Protects against XSS attacks
- Browser automatically includes cookie in requests

### Secure Flag

Session cookies are only transmitted over HTTPS:

```python
# In Flask
app.config['SESSION_COOKIE_SECURE'] = True
```

**Benefits:**
- Prevents transmission over unencrypted HTTP
- Protects against man-in-the-middle attacks
- Requires HTTPS for all authentication

### SameSite Attribute

Session cookies use SameSite=Strict:

```python
# In Flask
app.config['SESSION_COOKIE_SAMESITE'] = 'Strict'
```

**Benefits:**
- Prevents CSRF attacks
- Cookie not sent in cross-site requests
- Only sent in same-site requests

### Cookie Configuration Example

```python
# In Flask app
@app.after_request
def set_session_cookie(response):
    response.set_cookie(
        'session_token',
        token,
        max_age=86400,  # 24 hours
        secure=True,    # HTTPS only
        httponly=True,  # No JavaScript access
        samesite='Strict'  # CSRF protection
    )
    return response
```

---

## Session Validation

### Validation on Every Request

Session token is validated on every request to protected endpoints:

```python
from functools import wraps

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        token = request.cookies.get('session_token')
        
        if not token:
            return {'error': 'Not authenticated'}, 401
        
        is_valid, error, session = validate_session_token(db, token)
        
        if not is_valid:
            return {'error': error}, 401
        
        # Token is valid, proceed with request
        return f(*args, **kwargs)
    
    return decorated_function

@app.route('/api/todos')
@require_auth
def get_todos():
    # User is authenticated
    pass
```

### Validation Process

1. Extract session token from cookie
2. Hash token
3. Look up session in database
4. Check session exists
5. Check session not expired
6. Retrieve user from session
7. Proceed with request or return 401

---

## Session Invalidation

### Logout

Session is invalidated on logout:

```python
def invalidate_session(db, token):
    token_hash = hash_token(token)
    session = db.get_session_by_token_hash(token_hash)
    
    if session:
        db.delete_session(session.id)
    
    # Clear session cookie
    response.delete_cookie('session_token')
```

### Session Cleanup

Expired sessions are cleaned up:

```python
def cleanup_expired_sessions(db):
    now = datetime.now()
    db.delete_sessions_where(expires_at < now)
```

---

## Session Fixation Prevention

### New Token on Login

A new session token is generated on each login:

```python
def login(db, username, password):
    # Authenticate user
    user = authenticate(username, password)
    
    if not user:
        return False, "Invalid credentials"
    
    # Create NEW session (not reuse old one)
    success, error, (token, session) = create_session(db, user.id)
    
    return success, error, token
```

**Benefits:**
- Prevents session fixation attacks
- Each login gets fresh token
- Old tokens cannot be reused

---

## Session Hijacking Prevention

### HTTPS Enforcement

All session traffic must use HTTPS:

```python
from flask_talisman import Talisman

Talisman(app, force_https=True)
```

### Secure Flag

Session cookies only transmitted over HTTPS:

```python
app.config['SESSION_COOKIE_SECURE'] = True
```

### IP Address Validation (Optional)

Optionally validate IP address hasn't changed:

```python
def validate_session_ip(session, current_ip):
    if session.ip_address != current_ip:
        # IP changed - possible hijacking
        return False
    return True
```

---

## Session Monitoring

### Log Session Events

Log all session events for security monitoring:

```python
import logging

logger = logging.getLogger(__name__)

# Log session creation
logger.info(f"Session created for user: {user_id}")

# Log session validation
logger.debug(f"Session validated for user: {user_id}")

# Log session invalidation
logger.info(f"Session invalidated for user: {user_id}")

# Log suspicious activity
logger.warning(f"Session validation failed: {error}")
```

### Monitor for Anomalies

```python
def check_for_anomalies(db, user_id):
    sessions = db.get_user_sessions(user_id)
    
    # Check for multiple simultaneous sessions
    if len(sessions) > 5:
        logger.warning(f"User {user_id} has {len(sessions)} active sessions")
    
    # Check for sessions from different IPs
    ips = set(s.ip_address for s in sessions)
    if len(ips) > 3:
        logger.warning(f"User {user_id} has sessions from {len(ips)} different IPs")
```

---

## Testing

### Unit Tests

```python
import pytest
from session_manager import create_session, validate_session_token, invalidate_session

def test_session_creation():
    success, error, (token, session) = create_session(db, "user_123")
    
    assert success
    assert token is not None
    assert session.expires_at > datetime.now()

def test_session_validation():
    success, error, (token, session) = create_session(db, "user_123")
    
    is_valid, error, session = validate_session_token(db, token)
    assert is_valid

def test_session_expiration():
    # Create session with past expiration
    session = db.create_session("user_123", "hash", datetime.now() - timedelta(hours=1))
    
    is_valid, error, _ = validate_session_token(db, token)
    assert not is_valid
    assert "expired" in error

def test_session_invalidation():
    success, error, (token, session) = create_session(db, "user_123")
    
    invalidate_session(db, token)
    
    is_valid, error, _ = validate_session_token(db, token)
    assert not is_valid
```

---

## Configuration

### Session Duration

```python
# In session_manager.py
SESSION_DURATION_HOURS = 24  # 24-hour expiration
```

### Token Length

```python
# In session_manager.py
SESSION_TOKEN_LENGTH = 32  # 256 bits of entropy
```

---

## Related Documentation

- [Session Manager API](../backend/docs/SESSION_MANAGER.md) - Session implementation
- [Password Security](SECURITY_PASSWORD.md) - Password hashing
- [CSRF Protection](SECURITY_CSRF.md) - CSRF attack prevention
- [Rate Limiting](SECURITY_RATE_LIMITING.md) - Brute force protection
- [Security Best Practices](SECURITY_BEST_PRACTICES.md) - General security guidelines
