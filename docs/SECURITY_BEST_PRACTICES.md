# Security Best Practices Guide

## Overview

This document provides general security best practices for the User Login feature.

## HTTPS Enforcement

### Redirect HTTP to HTTPS

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### HSTS Header

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

### Certificate Management

- Use valid SSL/TLS certificate
- Renew certificate before expiration
- Use strong cipher suites
- Disable weak protocols (SSLv3, TLSv1.0)

---

## Input Validation

### Server-Side Validation

Always validate input on the server:

```python
def validate_username(username):
    if not isinstance(username, str):
        raise ValueError("Username must be string")
    
    if len(username) < 3 or len(username) > 50:
        raise ValueError("Username length invalid")
    
    if not re.match(r'^[a-zA-Z0-9_]+$', username):
        raise ValueError("Username contains invalid characters")
    
    return True
```

### Sanitize Output

Escape output to prevent XSS:

```python
from markupsafe import escape

@app.route('/api/auth/me')
def get_current_user():
    user = get_authenticated_user()
    return {
        'user': {
            'id': escape(user.id),
            'username': escape(user.username)
        }
    }
```

---

## Error Handling

### Generic Error Messages

Use generic error messages to prevent information leakage:

```python
# CORRECT - Generic message
return {'error': 'Invalid credentials'}, 401

# WRONG - Reveals information
return {'error': 'Username not found'}, 401
return {'error': 'Password is incorrect'}, 401
```

### Never Expose Stack Traces

```python
# WRONG - Exposes stack trace
try:
    process_request()
except Exception as e:
    return {'error': str(e)}, 500

# CORRECT - Generic error
try:
    process_request()
except Exception as e:
    logger.error(f"Error: {str(e)}")
    return {'error': 'Internal server error'}, 500
```

---

## Logging

### Log Security Events

```python
import logging

logger = logging.getLogger(__name__)

# Log successful login
logger.info(f"User {username} logged in successfully")

# Log failed login
logger.warning(f"Failed login attempt for user {username} from IP {ip}")

# Log rate limit trigger
logger.warning(f"Rate limit triggered for IP {ip} on {endpoint}")

# Log CSRF failure
logger.warning(f"CSRF validation failed for user {user_id}")
```

### Never Log Sensitive Data

```python
# WRONG - Never log passwords
logger.info(f"User password: {password}")
logger.info(f"Password hash: {password_hash}")

# CORRECT - Log only user action
logger.info(f"User {username} logged in")
```

---

## Security Headers

### Content Security Policy

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:;" always;
```

### X-Frame-Options

```nginx
add_header X-Frame-Options "DENY" always;
```

### X-Content-Type-Options

```nginx
add_header X-Content-Type-Options "nosniff" always;
```

### X-XSS-Protection

```nginx
add_header X-XSS-Protection "1; mode=block" always;
```

---

## Database Security

### Use Parameterized Queries

```python
# CORRECT - Parameterized query
user = db.query(User).filter(User.username == username).first()

# WRONG - SQL injection vulnerability
user = db.execute(f"SELECT * FROM users WHERE username = '{username}'")
```

### Principle of Least Privilege

```python
# Create database user with minimal permissions
CREATE USER 'app_user'@'localhost' IDENTIFIED BY 'strong_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON app_db.* TO 'app_user'@'localhost';
```

### Encrypt Sensitive Data

```python
from cryptography.fernet import Fernet

# Encrypt sensitive data
cipher = Fernet(key)
encrypted_data = cipher.encrypt(sensitive_data.encode())

# Decrypt when needed
decrypted_data = cipher.decrypt(encrypted_data).decode()
```

---

## API Security

### Rate Limiting

Implement rate limiting on all authentication endpoints:

```python
from rate_limiter import check_rate_limit

@app.route('/api/auth/login', methods=['POST'])
def login():
    ip = get_client_ip(request)
    
    is_allowed, error = check_rate_limit(db, ip, '/api/auth/login')
    if not is_allowed:
        return {'error': error}, 429
    
    return login_impl()
```

### CORS Configuration

```python
from flask_cors import CORS

CORS(app,
     origins=['https://yourdomain.com'],
     supports_credentials=True,
     allow_headers=['Content-Type', 'X-CSRF-Token'])
```

### API Versioning

```python
@app.route('/api/v1/auth/login', methods=['POST'])
def login_v1():
    pass

@app.route('/api/v2/auth/login', methods=['POST'])
def login_v2():
    pass
```

---

## Dependency Management

### Keep Dependencies Updated

```bash
# Check for outdated packages
pip list --outdated

# Update packages
pip install --upgrade package_name

# Use requirements.txt with pinned versions
pip freeze > requirements.txt
```

### Scan for Vulnerabilities

```bash
# Install safety
pip install safety

# Check for vulnerabilities
safety check
```

---

## Monitoring and Alerting

### Monitor for Attacks

```python
def check_for_attacks(db):
    # Check for brute force attempts
    attempts = db.get_rate_limit_attempts()
    for attempt in attempts:
        if attempt.attempt_count > 20:
            logger.critical(f"Possible brute force attack from {attempt.ip_address}")
    
    # Check for CSRF failures
    csrf_failures = db.get_csrf_failures()
    if len(csrf_failures) > 10:
        logger.critical("Multiple CSRF failures detected")
```

### Setup Alerts

```python
import smtplib

def send_security_alert(subject, message):
    # Send email alert
    msg = f"Subject: {subject}\n\n{message}"
    
    with smtplib.SMTP('smtp.gmail.com', 587) as server:
        server.starttls()
        server.login('admin@yourdomain.com', 'password')
        server.sendmail('admin@yourdomain.com', 'security@yourdomain.com', msg)
```

---

## Incident Response

### Security Incident Checklist

- [ ] Identify the incident
- [ ] Contain the incident
- [ ] Eradicate the threat
- [ ] Recover systems
- [ ] Post-incident review

### Breach Response

If a security breach occurs:

1. **Immediate Actions:**
   - Isolate affected systems
   - Preserve evidence
   - Notify security team

2. **Investigation:**
   - Determine scope of breach
   - Identify affected users
   - Review logs and audit trails

3. **Notification:**
   - Notify affected users
   - Notify regulatory authorities
   - Prepare public statement

4. **Recovery:**
   - Reset compromised passwords
   - Invalidate compromised sessions
   - Deploy security patches

---

## Security Checklist

### Pre-Deployment

- [ ] All security tests passing
- [ ] HTTPS configured
- [ ] Security headers configured
- [ ] Rate limiting configured
- [ ] CSRF protection enabled
- [ ] Input validation implemented
- [ ] Error handling secure
- [ ] Logging configured
- [ ] Database secured
- [ ] Dependencies updated

### Post-Deployment

- [ ] Monitor logs for errors
- [ ] Monitor for attacks
- [ ] Check for vulnerabilities
- [ ] Review access logs
- [ ] Verify backups
- [ ] Test incident response
- [ ] Update security documentation
- [ ] Train team on security

---

## Security Resources

### OWASP Top 10

1. Injection
2. Broken Authentication
3. Sensitive Data Exposure
4. XML External Entities (XXE)
5. Broken Access Control
6. Security Misconfiguration
7. Cross-Site Scripting (XSS)
8. Insecure Deserialization
9. Using Components with Known Vulnerabilities
10. Insufficient Logging & Monitoring

### Security Standards

- NIST Cybersecurity Framework
- ISO/IEC 27001
- PCI DSS (Payment Card Industry)
- GDPR (General Data Protection Regulation)

### Tools

- OWASP ZAP (Web Application Security Scanner)
- Burp Suite (Security Testing)
- Snyk (Dependency Vulnerability Scanner)
- SonarQube (Code Quality)

---

## Related Documentation

- [Password Security](SECURITY_PASSWORD.md) - Password hashing
- [Session Security](SECURITY_SESSION.md) - Session management
- [CSRF Protection](SECURITY_CSRF.md) - CSRF attack prevention
- [Rate Limiting](SECURITY_RATE_LIMITING.md) - Brute force protection
- [Data Isolation](SECURITY_DATA_ISOLATION.md) - User data isolation
