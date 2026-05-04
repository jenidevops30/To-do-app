# Deployment Guide: User Login Feature

## Overview

This guide provides step-by-step instructions for deploying the User Login feature to production. It covers database migrations, environment configuration, SSL/TLS setup, and rollback procedures.

**Validates**: Requirements 15.1, 15.2, 15.3, 15.4, 9.3, 9.4

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Database Migrations](#database-migrations)
3. [Environment Configuration](#environment-configuration)
4. [SSL/TLS Setup](#ssltls-setup)
5. [Deployment Steps](#deployment-steps)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Rollback Procedures](#rollback-procedures)
8. [Monitoring and Maintenance](#monitoring-and-maintenance)

---

## Pre-Deployment Checklist

Before deploying to production, verify the following:

### Code Quality
- [ ] All tests pass (unit, integration, property-based)
- [ ] Code review completed
- [ ] Security review completed
- [ ] No console errors or warnings
- [ ] No hardcoded secrets or credentials

### Configuration
- [ ] Environment variables configured
- [ ] Database connection string verified
- [ ] SSL/TLS certificates obtained
- [ ] CORS configuration set correctly
- [ ] Rate limiting thresholds reviewed

### Database
- [ ] Database backup created
- [ ] Migration scripts tested on staging
- [ ] Rollback plan documented
- [ ] Data migration verified

### Security
- [ ] HTTPS enforced
- [ ] Secure cookie flags enabled
- [ ] CSRF protection enabled
- [ ] Rate limiting enabled
- [ ] Security logging enabled

### Infrastructure
- [ ] Server capacity verified
- [ ] Load balancer configured
- [ ] Monitoring setup complete
- [ ] Logging setup complete
- [ ] Backup procedures in place

---

## Database Migrations

### Migration Overview

The User Login feature requires the following database changes:

1. Create `users` table
2. Create `sessions` table
3. Create `csrf_tokens` table
4. Create `rate_limit_attempts` table
5. Add `user_id` column to `todos` table
6. Create system user account
7. Migrate existing todos to system user

### Running Migrations

#### Step 1: Backup Database

```bash
# Create a backup of the current database
sqlite3 app.db ".backup app.db.backup"

# Or for PostgreSQL
pg_dump -U postgres app_db > app_db.backup.sql

# Or for MySQL
mysqldump -u root -p app_db > app_db.backup.sql
```

#### Step 2: Run Migration Script

```bash
# Navigate to backend directory
cd backend

# Run migrations
python -m migration_runner

# Or if using Flask CLI
flask db upgrade
```

#### Step 3: Verify Migration

```bash
# Check that all tables were created
sqlite3 app.db ".tables"

# Expected output should include:
# users sessions csrf_tokens rate_limit_attempts todos

# Verify system user was created
sqlite3 app.db "SELECT * FROM users WHERE username='system';"

# Verify existing todos were migrated
sqlite3 app.db "SELECT COUNT(*) FROM todos WHERE user_id='system';"
```

### Migration Rollback

If migration fails, rollback to the previous state:

```bash
# Restore from backup
sqlite3 app.db < app.db.backup

# Or for PostgreSQL
psql -U postgres app_db < app_db.backup.sql

# Or for MySQL
mysql -u root -p app_db < app_db.backup.sql
```

### Migration Verification Script

```python
# backend/verify_migration.py
import sqlite3
from datetime import datetime

def verify_migration(db_path):
    """Verify that all migration steps completed successfully."""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    checks = {
        'users_table': "SELECT name FROM sqlite_master WHERE type='table' AND name='users'",
        'sessions_table': "SELECT name FROM sqlite_master WHERE type='table' AND name='sessions'",
        'csrf_tokens_table': "SELECT name FROM sqlite_master WHERE type='table' AND name='csrf_tokens'",
        'rate_limit_table': "SELECT name FROM sqlite_master WHERE type='table' AND name='rate_limit_attempts'",
        'todos_user_id': "PRAGMA table_info(todos)" ,
        'system_user': "SELECT COUNT(*) FROM users WHERE username='system'",
        'todos_migrated': "SELECT COUNT(*) FROM todos WHERE user_id='system'"
    }
    
    results = {}
    for check_name, query in checks.items():
        try:
            cursor.execute(query)
            result = cursor.fetchall()
            results[check_name] = 'PASS' if result else 'FAIL'
        except Exception as e:
            results[check_name] = f'ERROR: {str(e)}'
    
    conn.close()
    
    # Print results
    print(f"Migration Verification - {datetime.now()}")
    print("=" * 50)
    for check, status in results.items():
        print(f"{check}: {status}")
    
    # Return True if all checks passed
    return all(status == 'PASS' for status in results.values())

if __name__ == '__main__':
    import sys
    db_path = sys.argv[1] if len(sys.argv) > 1 else 'app.db'
    success = verify_migration(db_path)
    sys.exit(0 if success else 1)
```

Run verification:

```bash
python backend/verify_migration.py app.db
```

---

## Environment Configuration

### Environment Variables

Create a `.env` file in the backend directory with the following variables:

```bash
# Database Configuration
DATABASE_URL=sqlite:///app.db
# Or for PostgreSQL:
# DATABASE_URL=postgresql://user:password@localhost:5432/app_db
# Or for MySQL:
# DATABASE_URL=mysql+pymysql://user:password@localhost:3306/app_db

# Flask Configuration
FLASK_ENV=production
FLASK_DEBUG=False
SECRET_KEY=your-secret-key-here-change-in-production

# Security Configuration
SECURE_COOKIES=True
HTTPS_ONLY=True
SESSION_COOKIE_SECURE=True
SESSION_COOKIE_HTTPONLY=True
SESSION_COOKIE_SAMESITE=Strict

# CORS Configuration
CORS_ORIGINS=https://example.com,https://www.example.com
CORS_ALLOW_CREDENTIALS=True

# Rate Limiting Configuration
RATE_LIMIT_SIGNUP_PER_HOUR=10
RATE_LIMIT_LOGIN_PER_15MIN=5
RATE_LIMIT_LOGIN_PER_HOUR=10

# Logging Configuration
LOG_LEVEL=INFO
LOG_FILE=logs/app.log
LOG_MAX_BYTES=10485760
LOG_BACKUP_COUNT=10

# Session Configuration
SESSION_TIMEOUT_HOURS=24
CSRF_TOKEN_EXPIRY_HOURS=1

# Email Configuration (for future password reset)
MAIL_SERVER=smtp.example.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=noreply@example.com
MAIL_PASSWORD=your-email-password
```

### Environment Variable Validation

```python
# backend/config.py
import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration."""
    
    # Database
    DATABASE_URL = os.getenv('DATABASE_URL', 'sqlite:///app.db')
    
    # Flask
    SECRET_KEY = os.getenv('SECRET_KEY')
    if not SECRET_KEY:
        raise ValueError("SECRET_KEY environment variable is required")
    
    # Security
    SECURE_COOKIES = os.getenv('SECURE_COOKIES', 'True') == 'True'
    HTTPS_ONLY = os.getenv('HTTPS_ONLY', 'True') == 'True'
    SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'True') == 'True'
    SESSION_COOKIE_HTTPONLY = os.getenv('SESSION_COOKIE_HTTPONLY', 'True') == 'True'
    SESSION_COOKIE_SAMESITE = os.getenv('SESSION_COOKIE_SAMESITE', 'Strict')
    
    # CORS
    CORS_ORIGINS = os.getenv('CORS_ORIGINS', 'http://localhost:3000').split(',')
    CORS_ALLOW_CREDENTIALS = os.getenv('CORS_ALLOW_CREDENTIALS', 'True') == 'True'
    
    # Rate Limiting
    RATE_LIMIT_SIGNUP_PER_HOUR = int(os.getenv('RATE_LIMIT_SIGNUP_PER_HOUR', '10'))
    RATE_LIMIT_LOGIN_PER_15MIN = int(os.getenv('RATE_LIMIT_LOGIN_PER_15MIN', '5'))
    RATE_LIMIT_LOGIN_PER_HOUR = int(os.getenv('RATE_LIMIT_LOGIN_PER_HOUR', '10'))
    
    # Logging
    LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
    LOG_FILE = os.getenv('LOG_FILE', 'logs/app.log')
    
    # Session
    SESSION_TIMEOUT_HOURS = int(os.getenv('SESSION_TIMEOUT_HOURS', '24'))
    CSRF_TOKEN_EXPIRY_HOURS = int(os.getenv('CSRF_TOKEN_EXPIRY_HOURS', '1'))

class ProductionConfig(Config):
    """Production configuration."""
    
    DEBUG = False
    TESTING = False
    
    # Enforce HTTPS in production
    HTTPS_ONLY = True
    SECURE_COOKIES = True
    SESSION_COOKIE_SECURE = True
    
    # Stricter rate limiting in production
    RATE_LIMIT_SIGNUP_PER_HOUR = 10
    RATE_LIMIT_LOGIN_PER_15MIN = 5
    RATE_LIMIT_LOGIN_PER_HOUR = 10

class DevelopmentConfig(Config):
    """Development configuration."""
    
    DEBUG = True
    TESTING = False
    
    # Relaxed security in development
    HTTPS_ONLY = False
    SECURE_COOKIES = False
    SESSION_COOKIE_SECURE = False
    
    # Relaxed rate limiting in development
    RATE_LIMIT_SIGNUP_PER_HOUR = 100
    RATE_LIMIT_LOGIN_PER_15MIN = 50
    RATE_LIMIT_LOGIN_PER_HOUR = 100

class TestingConfig(Config):
    """Testing configuration."""
    
    DEBUG = True
    TESTING = True
    DATABASE_URL = 'sqlite:///:memory:'
    
    # Disable rate limiting in tests
    RATE_LIMIT_SIGNUP_PER_HOUR = 1000
    RATE_LIMIT_LOGIN_PER_15MIN = 1000
    RATE_LIMIT_LOGIN_PER_HOUR = 1000
```

---

## SSL/TLS Setup

### Obtaining SSL/TLS Certificates

#### Option 1: Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt-get install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot certonly --nginx -d example.com -d www.example.com

# Certificates are stored in:
# /etc/letsencrypt/live/example.com/
```

#### Option 2: Self-Signed Certificate (Development Only)

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -nodes -out cert.pem -keyout key.pem -days 365

# This creates:
# - cert.pem: Certificate file
# - key.pem: Private key file
```

### Configuring Flask for HTTPS

```python
# backend/app.py
from flask import Flask
from flask_talisman import Talisman

app = Flask(__name__)

# Enable HTTPS enforcement
if app.config['HTTPS_ONLY']:
    Talisman(app, force_https=True)

# Configure SSL context
if app.config['HTTPS_ONLY']:
    import ssl
    ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLSv1_2)
    ssl_context.load_cert_chain(
        'path/to/cert.pem',
        'path/to/key.pem'
    )
    app.run(ssl_context=ssl_context)
```

### Configuring Nginx for HTTPS

```nginx
# /etc/nginx/sites-available/example.com
server {
    listen 80;
    server_name example.com www.example.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com www.example.com;
    
    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    
    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    
    # HSTS header
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    
    # Proxy to Flask app
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Deployment Steps

### Step 1: Prepare Backend

```bash
# Clone repository
git clone https://github.com/example/todo-app.git
cd todo-app/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file with production configuration
cp .env.example .env
# Edit .env with production values
nano .env
```

### Step 2: Prepare Frontend

```bash
# Navigate to frontend directory
cd ../frontend

# Install dependencies
npm install

# Build for production
npm run build

# Output is in dist/ directory
```

### Step 3: Run Database Migrations

```bash
# Navigate to backend directory
cd ../backend

# Run migrations
python -m migration_runner

# Verify migration
python verify_migration.py app.db
```

### Step 4: Deploy Backend

```bash
# Using Gunicorn (recommended for production)
pip install gunicorn

# Run with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:create_app()

# Or using systemd service
sudo systemctl start todo-app
sudo systemctl enable todo-app
```

### Step 5: Deploy Frontend

```bash
# Copy built files to web server
sudo cp -r frontend/dist/* /var/www/example.com/

# Set permissions
sudo chown -R www-data:www-data /var/www/example.com/
sudo chmod -R 755 /var/www/example.com/
```

### Step 6: Verify Deployment

```bash
# Test API endpoints
curl -X GET https://api.example.com/api/auth/csrf-token

# Test frontend
curl -X GET https://example.com/

# Check logs
tail -f logs/app.log
```

---

## Post-Deployment Verification

### Verification Checklist

- [ ] HTTPS is enforced (HTTP redirects to HTTPS)
- [ ] SSL/TLS certificate is valid
- [ ] API endpoints are accessible
- [ ] Frontend is loading correctly
- [ ] Database migrations completed successfully
- [ ] System user was created
- [ ] Existing todos were migrated
- [ ] Rate limiting is working
- [ ] CSRF protection is working
- [ ] Session cookies have correct flags
- [ ] Logging is working
- [ ] Monitoring is working

### Verification Commands

```bash
# Test HTTPS enforcement
curl -I http://api.example.com/api/auth/csrf-token
# Should redirect to https://

# Test SSL certificate
openssl s_client -connect api.example.com:443

# Test API endpoint
curl -X GET https://api.example.com/api/auth/csrf-token

# Test CSRF token
curl -X GET https://api.example.com/api/auth/csrf-token | jq .

# Test rate limiting
for i in {1..6}; do
  curl -X POST https://api.example.com/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"test","csrfToken":"test"}'
done
# 6th request should return 429

# Check logs
tail -f logs/app.log | grep -i "error\|warning"

# Check database
sqlite3 app.db "SELECT COUNT(*) FROM users;"
sqlite3 app.db "SELECT COUNT(*) FROM todos;"
```

---

## Rollback Procedures

### Quick Rollback (Last 24 Hours)

If critical issues are discovered within 24 hours of deployment:

```bash
# 1. Stop the application
sudo systemctl stop todo-app

# 2. Restore database from backup
sqlite3 app.db < app.db.backup

# 3. Revert code to previous version
git checkout previous-version

# 4. Restart application
sudo systemctl start todo-app

# 5. Verify rollback
curl -X GET https://api.example.com/api/auth/csrf-token
```

### Full Rollback (Database)

If database migration caused issues:

```bash
# 1. Backup current database
sqlite3 app.db ".backup app.db.failed"

# 2. Restore from pre-migration backup
sqlite3 app.db < app.db.backup

# 3. Verify restoration
sqlite3 app.db ".tables"
sqlite3 app.db "SELECT COUNT(*) FROM todos;"

# 4. Restart application
sudo systemctl restart todo-app
```

### Partial Rollback (Frontend Only)

If frontend has issues but backend is fine:

```bash
# 1. Restore previous frontend build
sudo cp -r frontend/dist.backup/* /var/www/example.com/

# 2. Clear browser cache
# Instruct users to clear cache or wait for cache expiration

# 3. Verify frontend
curl -X GET https://example.com/
```

### Rollback Verification

After rollback, verify the system is working:

```bash
# Test API
curl -X GET https://api.example.com/api/auth/csrf-token

# Test frontend
curl -X GET https://example.com/

# Check logs for errors
tail -f logs/app.log

# Verify database integrity
sqlite3 app.db "PRAGMA integrity_check;"

# Check user count
sqlite3 app.db "SELECT COUNT(*) FROM users;"
```

---

## Monitoring and Maintenance

### Monitoring Setup

#### Application Monitoring

```python
# backend/monitoring.py
import logging
from datetime import datetime

class ApplicationMonitor:
    """Monitor application health and performance."""
    
    def __init__(self, log_file='logs/app.log'):
        self.log_file = log_file
        self.logger = logging.getLogger(__name__)
    
    def check_database_connection(self, db):
        """Check if database is accessible."""
        try:
            cursor = db.get_connection().cursor()
            cursor.execute("SELECT 1")
            return True, "Database connection OK"
        except Exception as e:
            return False, f"Database connection failed: {str(e)}"
    
    def check_disk_space(self, path='/'):
        """Check available disk space."""
        import shutil
        total, used, free = shutil.disk_usage(path)
        percent_used = (used / total) * 100
        
        if percent_used > 90:
            return False, f"Disk usage critical: {percent_used:.1f}%"
        elif percent_used > 80:
            return True, f"Disk usage high: {percent_used:.1f}%"
        else:
            return True, f"Disk usage OK: {percent_used:.1f}%"
    
    def check_log_file_size(self):
        """Check log file size."""
        import os
        size = os.path.getsize(self.log_file) / (1024 * 1024)  # MB
        
        if size > 100:
            return False, f"Log file too large: {size:.1f} MB"
        else:
            return True, f"Log file size OK: {size:.1f} MB"
    
    def health_check(self, db):
        """Perform full health check."""
        checks = {
            'database': self.check_database_connection(db),
            'disk_space': self.check_disk_space(),
            'log_file': self.check_log_file_size()
        }
        
        all_ok = all(status for status, _ in checks.values())
        
        return {
            'status': 'healthy' if all_ok else 'degraded',
            'timestamp': datetime.now().isoformat(),
            'checks': {name: msg for name, (_, msg) in checks.items()}
        }
```

#### Health Check Endpoint

```python
# backend/routes.py
@api.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint for monitoring."""
    from monitoring import ApplicationMonitor
    
    monitor = ApplicationMonitor()
    health = monitor.health_check(current_app.db)
    
    status_code = 200 if health['status'] == 'healthy' else 503
    return jsonify(health), status_code
```

### Log Rotation

```bash
# /etc/logrotate.d/todo-app
/var/log/todo-app/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        systemctl reload todo-app > /dev/null 2>&1 || true
    endscript
}
```

### Backup Strategy

```bash
# Daily database backup
0 2 * * * /usr/local/bin/backup-database.sh

# Weekly full backup
0 3 * * 0 /usr/local/bin/backup-full.sh

# Monthly archive
0 4 1 * * /usr/local/bin/archive-backups.sh
```

### Backup Script

```bash
#!/bin/bash
# /usr/local/bin/backup-database.sh

BACKUP_DIR="/backups/todo-app"
DB_PATH="/var/lib/todo-app/app.db"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Backup database
sqlite3 $DB_PATH ".backup $BACKUP_DIR/app_$DATE.db"

# Compress backup
gzip $BACKUP_DIR/app_$DATE.db

# Remove backups older than 30 days
find $BACKUP_DIR -name "app_*.db.gz" -mtime +30 -delete

# Log backup
echo "Database backup completed: $BACKUP_DIR/app_$DATE.db.gz" >> /var/log/todo-app/backup.log
```

