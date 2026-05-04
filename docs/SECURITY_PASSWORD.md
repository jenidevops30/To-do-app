# Password Security Practices

## Overview

This document describes password security practices implemented in the User Login feature.

## Password Hashing

### Bcrypt Algorithm

Passwords are hashed using bcrypt with a minimum cost factor of 10.

**Why Bcrypt:**
- Industry standard for password hashing
- Automatically generates random salt
- Computationally expensive (resistant to brute force)
- Adaptive (cost factor can be increased over time)

**Cost Factor:**
- Default: 10
- Minimum: 10
- Recommended: 12+ for new deployments

**Hashing Time:**
- Cost 10: ~100ms per hash
- Cost 12: ~250ms per hash
- Cost 14: ~1000ms per hash

### Implementation

```python
import bcrypt

# Hash password
password = "MyPassword123"
salt = bcrypt.gensalt(rounds=10)
password_hash = bcrypt.hashpw(password.encode('utf-8'), salt)

# Verify password
is_valid = bcrypt.checkpw(password.encode('utf-8'), password_hash)
```

### Storage

- Passwords are NEVER stored in plaintext
- Only bcrypt hashes are stored in database
- Each password hash is unique (due to random salt)
- Hashes cannot be reversed to get original password

---

## Password Validation Rules

### Length Requirements

- **Minimum:** 8 characters
- **Maximum:** 128 characters

**Rationale:**
- 8 characters: Minimum for reasonable security
- 128 characters: Prevents extremely long passwords that could cause issues

### Complexity Requirements

- **Must contain:** At least one letter (a-z, A-Z)
- **Must contain:** At least one number (0-9)
- **Special characters:** Allowed but not required

**Rationale:**
- Letters + numbers: Prevents simple passwords
- No special character requirement: Improves usability
- Allows special characters: Supports strong passwords

### Validation Examples

**Valid Passwords:**
- `MyPassword123` (letters + numbers)
- `Secure@Pass456` (letters + numbers + special chars)
- `P@ssw0rd` (mixed case + special char + number)

**Invalid Passwords:**
- `password` (no numbers)
- `12345678` (no letters)
- `Pass1` (too short)
- `MyPassword` (no numbers)

---

## Password Security Best Practices

### Client-Side Validation

Validate passwords on the client before sending to server:

```typescript
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }
  
  if (!/[a-zA-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one letter' };
  }
  
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  
  return { valid: true };
}
```

### Server-Side Validation

Always validate passwords on the server:

```python
def validate_password(password: str) -> Tuple[bool, Optional[str]]:
    if len(password) < 8:
        return False, "Password must be at least 8 characters"
    
    if not any(c.isalpha() for c in password):
        return False, "Password must contain at least one letter"
    
    if not any(c.isdigit() for c in password):
        return False, "Password must contain at least one number"
    
    return True, None
```

### Never Log Passwords

Never log passwords or password hashes:

```python
# WRONG - Never do this
logger.info(f"User password: {password}")
logger.info(f"Password hash: {password_hash}")

# CORRECT - Log only user action
logger.info(f"User {username} logged in successfully")
logger.warning(f"Failed login attempt for user {username}")
```

### Use HTTPS Only

Always transmit passwords over HTTPS:

```python
# In Flask app
from flask_talisman import Talisman

Talisman(app, force_https=True)
```

### Constant-Time Comparison

Use constant-time comparison to prevent timing attacks:

```python
import bcrypt

# CORRECT - Uses constant-time comparison
is_valid = bcrypt.checkpw(password.encode('utf-8'), password_hash)

# WRONG - Vulnerable to timing attacks
is_valid = password_hash == hash_password(password)
```

---

## Password Reset Security

### Secure Password Reset Flow

1. User requests password reset
2. Server generates secure reset token
3. Token sent via email (not in URL)
4. User clicks link with token
5. User enters new password
6. Server validates token and updates password
7. Token is invalidated

### Reset Token Requirements

- **Length:** 32+ characters
- **Entropy:** Cryptographically random
- **Expiration:** 1 hour
- **One-time use:** Token invalidated after use

### Implementation

```python
import secrets
import hashlib
from datetime import datetime, timedelta

# Generate reset token
reset_token = secrets.token_urlsafe(32)
token_hash = hashlib.sha256(reset_token.encode()).hexdigest()
expires_at = datetime.now() + timedelta(hours=1)

# Store token hash in database
db.create_password_reset_token(user_id, token_hash, expires_at)

# Send token to user via email (not in URL)
send_email(user.email, f"Your password reset token: {reset_token}")
```

---

## Password Strength Meter

### Client-Side Strength Indicator

```typescript
function calculatePasswordStrength(password: string): number {
  let strength = 0;
  
  // Length
  if (password.length >= 8) strength += 1;
  if (password.length >= 12) strength += 1;
  if (password.length >= 16) strength += 1;
  
  // Character types
  if (/[a-z]/.test(password)) strength += 1;
  if (/[A-Z]/.test(password)) strength += 1;
  if (/[0-9]/.test(password)) strength += 1;
  if (/[^a-zA-Z0-9]/.test(password)) strength += 1;
  
  return Math.min(strength, 5);
}

// Usage
const strength = calculatePasswordStrength(password);
// 0-1: Weak
// 2-3: Fair
// 4: Good
// 5: Strong
```

---

## Common Password Vulnerabilities

### Weak Passwords

**Problem:** Users choose weak passwords

**Solution:**
- Enforce minimum length (8 characters)
- Require complexity (letters + numbers)
- Show password strength meter
- Reject common passwords

### Dictionary Attacks

**Problem:** Attackers try common passwords

**Solution:**
- Use bcrypt with high cost factor
- Implement rate limiting
- Monitor for brute force attempts
- Lock accounts after failed attempts

### Rainbow Tables

**Problem:** Pre-computed hash tables

**Solution:**
- Use bcrypt with random salt
- Each password has unique hash
- Rainbow tables ineffective

### Timing Attacks

**Problem:** Attackers measure response time

**Solution:**
- Use constant-time comparison
- Bcrypt.checkpw() uses constant-time comparison
- Never compare hashes directly

---

## Password Expiration

### Expiration Policy

- **Recommended:** No forced expiration
- **Alternative:** Expiration after 90 days
- **Compromise:** Expiration after 1 year

**Rationale:**
- Forced expiration encourages weak passwords
- Users write down passwords if forced to change
- Better to require strong passwords initially

### Implementation

```python
def check_password_expiration(user):
    if not user.password_changed_at:
        return False
    
    days_since_change = (datetime.now() - user.password_changed_at).days
    
    if days_since_change > 365:
        return True  # Password expired
    
    return False
```

---

## Compromised Password Response

### Detection

Monitor for compromised passwords:

```python
# Check against known compromised passwords
import requests

def is_password_compromised(password):
    # Use Have I Been Pwned API
    sha1_hash = hashlib.sha1(password.encode()).hexdigest().upper()
    prefix = sha1_hash[:5]
    suffix = sha1_hash[5:]
    
    response = requests.get(f'https://api.pwnedpasswords.com/range/{prefix}')
    
    for line in response.text.split('\r\n'):
        hash_suffix, count = line.split(':')
        if hash_suffix == suffix:
            return True
    
    return False
```

### Response

If password is compromised:

1. Notify user immediately
2. Force password reset
3. Invalidate all sessions
4. Send security alert email
5. Log incident

---

## Testing

### Unit Tests

```python
import pytest
from auth_service import hash_password, verify_password, validate_password

def test_password_hashing():
    password = "MyPassword123"
    password_hash = hash_password(password)
    
    # Hash should not be plaintext
    assert password_hash != password
    
    # Verification should work
    assert verify_password(password, password_hash)
    
    # Wrong password should fail
    assert not verify_password("WrongPassword", password_hash)

def test_password_validation():
    # Valid password
    valid, error = validate_password("MyPassword123")
    assert valid
    assert error is None
    
    # Too short
    valid, error = validate_password("Pass1")
    assert not valid
    assert "at least 8 characters" in error
    
    # No numbers
    valid, error = validate_password("MyPassword")
    assert not valid
    assert "number" in error
```

---

## Configuration

### Bcrypt Cost Factor

```python
# In auth_service.py
BCRYPT_COST_FACTOR = 10  # Minimum recommended

# For higher security (slower)
BCRYPT_COST_FACTOR = 12
```

### Password Requirements

```python
# In auth_service.py
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128
```

---

## Related Documentation

- [Authentication Service API](../backend/docs/AUTHENTICATION_SERVICE.md) - Password hashing implementation
- [Session Security](SECURITY_SESSION.md) - Session management security
- [CSRF Protection](SECURITY_CSRF.md) - CSRF attack prevention
- [Rate Limiting](SECURITY_RATE_LIMITING.md) - Brute force protection
- [Security Best Practices](SECURITY_BEST_PRACTICES.md) - General security guidelines
