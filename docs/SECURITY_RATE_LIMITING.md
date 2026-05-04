# Rate Limiting Configuration

## Overview

This document describes rate limiting configuration for protecting authentication endpoints against brute force attacks.

## Thresholds

### Login Endpoint (/api/auth/login)

**Threshold 1: 5 attempts in 15 minutes**
- Tracks failed login attempts within 15-minute window
- If 5 attempts made, IP is blocked for 1 hour
- Prevents rapid-fire password guessing

**Threshold 2: 10 attempts in 1 hour**
- Tracks failed login attempts within 1-hour window
- If 10 attempts made, IP is blocked for 1 hour
- Prevents distributed brute force attacks

### Signup Endpoint (/api/auth/signup)

**Threshold: 10 attempts in 1 hour**
- Tracks signup attempts within 1-hour window
- If 10 attempts made, IP is blocked for 1 hour
- Prevents account creation spam

---

## Configuration

### Rate Limit Constants

```python
# In rate_limiter.py
RATE_LIMIT_15MIN_THRESHOLD = 5      # 5 attempts in 15 minutes
RATE_LIMIT_1HOUR_THRESHOLD = 10     # 10 attempts in 1 hour
RATE_LIMIT_15MIN_WINDOW = 15        # minutes
RATE_LIMIT_1HOUR_WINDOW = 60        # minutes
RATE_LIMIT_BLOCK_DURATION = 60      # minutes (1 hour)
```

### Customization

To adjust thresholds:

```python
# More aggressive (stricter)
RATE_LIMIT_15MIN_THRESHOLD = 3      # 3 attempts in 15 minutes
RATE_LIMIT_BLOCK_DURATION = 120     # 2 hour block

# More lenient (user-friendly)
RATE_LIMIT_15MIN_THRESHOLD = 10     # 10 attempts in 15 minutes
RATE_LIMIT_BLOCK_DURATION = 30      # 30 minute block
```

---

## Implementation

### Check Rate Limit

```python
from rate_limiter import check_rate_limit

@app.route('/api/auth/login', methods=['POST'])
def login():
    # Get client IP
    ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
    
    # Check rate limit
    is_allowed, error = check_rate_limit(db, ip_address, '/api/auth/login')
    
    if not is_allowed:
        return {'error': error}, 429
    
    # Process login
    return login_impl()
```

### Track Attempt

```python
from rate_limiter import track_attempt

@app.route('/api/auth/login', methods=['POST'])
def login():
    ip_address = request.headers.get('X-Forwarded-For', request.remote_addr)
    
    # Attempt login
    success, error, user = login_service.login(username, password)
    
    if not success:
        # Track failed attempt
        track_attempt(db, ip_address, '/api/auth/login')
        return {'error': error}, 401
    
    return {'success': True}
```

---

## IP Address Handling

### X-Forwarded-For Header

Support X-Forwarded-For header for proxied requests:

```python
def get_client_ip(request):
    # Get X-Forwarded-For header (for proxied requests)
    x_forwarded_for = request.headers.get('X-Forwarded-For')
    
    if x_forwarded_for:
        # X-Forwarded-For can contain multiple IPs
        # Use the first one (client IP)
        ip = x_forwarded_for.split(',')[0].strip()
        return ip
    
    # Fall back to remote_addr
    return request.remote_addr
```

### Nginx Configuration

Configure Nginx to pass client IP:

```nginx
location /api/ {
    proxy_pass http://backend:5000/api/;
    proxy_set_header X-Forwarded-For $remote_addr;
}
```

---

## Monitoring

### Log Rate Limit Events

```python
import logging

logger = logging.getLogger(__name__)

# Log rate limit trigger
logger.warning(f"Rate limit triggered for {ip_address} on {endpoint}")

# Log rate limit block
logger.warning(f"IP blocked: {ip_address} on {endpoint} until {block_until}")

# Log rate limit unblock
logger.info(f"IP unblocked: {ip_address} on {endpoint}")
```

### Monitor Blocked IPs

```python
def get_blocked_ips(db):
    attempts = db.get_all_rate_limit_attempts()
    blocked = []
    
    for attempt in attempts:
        if attempt.blocked_until and datetime.now() < attempt.blocked_until:
            blocked.append({
                'ip': attempt.ip_address,
                'endpoint': attempt.endpoint,
                'attempts': attempt.attempt_count,
                'blocked_until': attempt.blocked_until
            })
    
    return blocked
```

---

## Whitelist/Blacklist

### IP Whitelist

Allow certain IPs to bypass rate limiting:

```python
RATE_LIMIT_WHITELIST = [
    '127.0.0.1',      # Localhost
    '192.168.1.0/24', # Internal network
]

def is_whitelisted(ip_address):
    for whitelist_ip in RATE_LIMIT_WHITELIST:
        if ip_address == whitelist_ip:
            return True
    return False

@app.route('/api/auth/login', methods=['POST'])
def login():
    ip_address = get_client_ip(request)
    
    # Skip rate limiting for whitelisted IPs
    if not is_whitelisted(ip_address):
        is_allowed, error = check_rate_limit(db, ip_address, '/api/auth/login')
        if not is_allowed:
            return {'error': error}, 429
    
    return login_impl()
```

### IP Blacklist

Permanently block certain IPs:

```python
RATE_LIMIT_BLACKLIST = [
    '192.168.1.100',  # Known attacker
]

def is_blacklisted(ip_address):
    return ip_address in RATE_LIMIT_BLACKLIST

@app.route('/api/auth/login', methods=['POST'])
def login():
    ip_address = get_client_ip(request)
    
    # Block blacklisted IPs
    if is_blacklisted(ip_address):
        return {'error': 'Access denied'}, 403
    
    return login_impl()
```

---

## Manual IP Management

### Block IP

```python
from rate_limiter import block_ip

# Manually block an IP
success, error = block_ip(db, '192.168.1.100', '/api/auth/login', duration_minutes=120)
```

### Unblock IP

```python
from rate_limiter import unblock_ip

# Manually unblock an IP
success, error = unblock_ip(db, '192.168.1.100', '/api/auth/login')
```

---

## Testing

### Unit Tests

```python
import pytest
from rate_limiter import track_attempt, check_rate_limit

def test_rate_limit_tracking():
    ip = '192.168.1.100'
    endpoint = '/api/auth/login'
    
    # First 5 attempts should be allowed
    for i in range(5):
        should_allow, error = track_attempt(db, ip, endpoint)
        assert should_allow
    
    # 6th attempt should be blocked
    should_allow, error = track_attempt(db, ip, endpoint)
    assert not should_allow

def test_rate_limit_check():
    ip = '192.168.1.100'
    endpoint = '/api/auth/login'
    
    # Make 5 attempts
    for i in range(5):
        track_attempt(db, ip, endpoint)
    
    # Check should show blocked
    is_allowed, error = check_rate_limit(db, ip, endpoint)
    assert not is_allowed

def test_rate_limit_expiration():
    ip = '192.168.1.100'
    endpoint = '/api/auth/login'
    
    # Make 5 attempts
    for i in range(5):
        track_attempt(db, ip, endpoint)
    
    # Should be blocked
    is_allowed, error = check_rate_limit(db, ip, endpoint)
    assert not is_allowed
    
    # Wait for block to expire (in test, simulate time passing)
    # After expiration, should be allowed
```

---

## Performance Considerations

### Database Queries

Rate limiting requires database queries:

```python
# Get rate limit attempt
attempt = db.get_rate_limit_attempt(ip_address, endpoint)

# Update rate limit attempt
db.update_rate_limit_attempt(ip_address, endpoint, attempt_count=count)
```

### Caching

Consider caching rate limit checks:

```python
from functools import lru_cache
from datetime import datetime, timedelta

@lru_cache(maxsize=1000)
def check_rate_limit_cached(ip_address, endpoint, timestamp):
    # Cache for 1 second
    return check_rate_limit(db, ip_address, endpoint)

# Use cached version
timestamp = int(datetime.now().timestamp())
is_allowed, error = check_rate_limit_cached(ip_address, endpoint, timestamp)
```

---

## Related Documentation

- [Rate Limiter API](../backend/docs/RATE_LIMITER.md) - Rate limiting implementation
- [Password Security](SECURITY_PASSWORD.md) - Password hashing
- [Session Security](SECURITY_SESSION.md) - Session management
- [CSRF Protection](SECURITY_CSRF.md) - CSRF attack prevention
- [Security Best Practices](SECURITY_BEST_PRACTICES.md) - General security guidelines
