# Migration Runbook: User Login Feature

## Overview

This runbook provides detailed step-by-step instructions for executing the database migration to add the User Login feature. It includes pre-migration checks, execution steps, post-migration verification, and rollback procedures.

**Validates**: Requirements 15.1, 15.2, 15.3, 15.4

---

## Table of Contents

1. [Pre-Migration Checks](#pre-migration-checks)
2. [Migration Execution](#migration-execution)
3. [Post-Migration Verification](#post-migration-verification)
4. [Rollback Procedures](#rollback-procedures)
5. [Troubleshooting](#troubleshooting)

---

## Pre-Migration Checks

### Check 1: Database Backup

**Purpose**: Ensure we can recover if migration fails

**Steps**:
```bash
# Navigate to backend directory
cd backend

# Create backup of current database
sqlite3 app.db ".backup app.db.pre-migration.backup"

# Verify backup was created
ls -lh app.db.pre-migration.backup

# Expected output:
# -rw-r--r-- 1 user group 1.2M Jan 15 10:00 app.db.pre-migration.backup
```

**Success Criteria**:
- Backup file exists
- Backup file size is reasonable (not 0 bytes)
- Backup file is readable

**Failure Action**: If backup fails, do not proceed with migration

---

### Check 2: Database Integrity

**Purpose**: Ensure database is not corrupted before migration

**Steps**:
```bash
# Check database integrity
sqlite3 app.db "PRAGMA integrity_check;"

# Expected output:
# ok
```

**Success Criteria**:
- Output is "ok"
- No errors or warnings

**Failure Action**: If integrity check fails, restore from backup and investigate

---

### Check 3: Current Database Schema

**Purpose**: Document current schema before migration

**Steps**:
```bash
# List current tables
sqlite3 app.db ".tables"

# Expected output:
# todos

# Get schema of todos table
sqlite3 app.db ".schema todos"

# Expected output:
# CREATE TABLE todos (
#     id INTEGER PRIMARY KEY AUTOINCREMENT,
#     title TEXT NOT NULL,
#     description TEXT,
#     completed BOOLEAN DEFAULT 0,
#     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
#     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
# );

# Count existing todos
sqlite3 app.db "SELECT COUNT(*) FROM todos;"

# Expected output:
# (number of existing todos)
```

**Success Criteria**:
- todos table exists
- Schema matches expected structure
- Can count todos

**Failure Action**: If schema is unexpected, investigate before proceeding

---

### Check 4: Disk Space

**Purpose**: Ensure sufficient disk space for migration

**Steps**:
```bash
# Check available disk space
df -h

# Expected output:
# Filesystem      Size  Used Avail Use% Mounted on
# /dev/sda1       100G   50G   50G  50% /

# Check database file size
ls -lh app.db

# Expected output:
# -rw-r--r-- 1 user group 1.2M Jan 15 10:00 app.db
```

**Success Criteria**:
- At least 1 GB free disk space
- Database file is accessible

**Failure Action**: If insufficient disk space, free up space before proceeding

---

### Check 5: Application Status

**Purpose**: Ensure application is stopped before migration

**Steps**:
```bash
# Check if application is running
ps aux | grep "python.*app.py"

# If running, stop the application
sudo systemctl stop todo-app

# Verify application is stopped
ps aux | grep "python.*app.py"

# Expected output:
# (no running processes)
```

**Success Criteria**:
- Application is not running
- No Flask processes are active

**Failure Action**: If application won't stop, investigate and force stop if necessary

---

### Check 6: Python Environment

**Purpose**: Ensure Python environment is properly configured

**Steps**:
```bash
# Activate virtual environment
source venv/bin/activate

# Check Python version
python --version

# Expected output:
# Python 3.8+ (3.8, 3.9, 3.10, 3.11, etc.)

# Check required packages
pip list | grep -E "flask|bcrypt|python-dotenv"

# Expected output:
# flask                    2.x.x
# bcrypt                   4.x.x
# python-dotenv            0.x.x
```

**Success Criteria**:
- Python 3.8 or higher
- All required packages installed

**Failure Action**: If packages are missing, install them before proceeding

---

### Pre-Migration Checklist

Before proceeding with migration, verify all checks:

```
[ ] Database backup created and verified
[ ] Database integrity check passed
[ ] Current schema documented
[ ] Sufficient disk space available
[ ] Application is stopped
[ ] Python environment is configured
```

---

## Migration Execution

### Step 1: Review Migration Scripts

**Purpose**: Understand what changes will be made

**Steps**:
```bash
# List migration files
ls -la backend/migrations/

# Expected output:
# 001_create_users_table.sql
# 002_create_sessions_table.sql
# 003_create_csrf_tokens_table.sql
# 004_create_rate_limit_attempts_table.sql
# 005_add_user_id_to_todos.sql
# 006_create_system_user.sql
# 007_migrate_todos_to_system_user.sql

# Review each migration file
cat backend/migrations/001_create_users_table.sql
cat backend/migrations/002_create_sessions_table.sql
# ... etc
```

**Success Criteria**:
- All migration files are present
- Migration files are readable
- SQL syntax appears correct

**Failure Action**: If migration files are missing or corrupted, do not proceed

---

### Step 2: Run Migration Script

**Purpose**: Execute database migrations

**Steps**:
```bash
# Navigate to backend directory
cd backend

# Activate virtual environment
source venv/bin/activate

# Run migration runner
python -m migration_runner

# Expected output:
# Running migrations...
# Executing migration: 001_create_users_table.sql
# Executing migration: 002_create_sessions_table.sql
# Executing migration: 003_create_csrf_tokens_table.sql
# Executing migration: 004_create_rate_limit_attempts_table.sql
# Executing migration: 005_add_user_id_to_todos.sql
# Executing migration: 006_create_system_user.sql
# Executing migration: 007_migrate_todos_to_system_user.sql
# All migrations completed successfully!
```

**Success Criteria**:
- All migrations execute without errors
- No SQL errors or warnings
- Migration completes in reasonable time (< 5 minutes)

**Failure Action**: If migration fails, see [Rollback Procedures](#rollback-procedures)

---

### Step 3: Verify Migration Execution

**Purpose**: Confirm all migrations were applied

**Steps**:
```bash
# Check migration history
sqlite3 app.db "SELECT * FROM schema_migrations ORDER BY version;"

# Expected output:
# version|name|executed_at
# 1|001_create_users_table.sql|2024-01-15 10:00:00
# 2|002_create_sessions_table.sql|2024-01-15 10:00:01
# 3|003_create_csrf_tokens_table.sql|2024-01-15 10:00:02
# 4|004_create_rate_limit_attempts_table.sql|2024-01-15 10:00:03
# 5|005_add_user_id_to_todos.sql|2024-01-15 10:00:04
# 6|006_create_system_user.sql|2024-01-15 10:00:05
# 7|007_migrate_todos_to_system_user.sql|2024-01-15 10:00:06
```

**Success Criteria**:
- All 7 migrations are listed
- All migrations have execution timestamps
- No failed migrations

**Failure Action**: If migrations are missing, investigate and re-run if necessary

---

### Step 4: Verify New Tables

**Purpose**: Confirm all new tables were created

**Steps**:
```bash
# List all tables
sqlite3 app.db ".tables"

# Expected output:
# csrf_tokens rate_limit_attempts schema_migrations sessions todos users

# Verify each table structure
sqlite3 app.db ".schema users"
sqlite3 app.db ".schema sessions"
sqlite3 app.db ".schema csrf_tokens"
sqlite3 app.db ".schema rate_limit_attempts"

# Expected output for users table:
# CREATE TABLE users (
#     id TEXT PRIMARY KEY,
#     username TEXT UNIQUE NOT NULL,
#     password_hash TEXT NOT NULL,
#     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
#     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
# );
```

**Success Criteria**:
- All 6 tables exist (users, sessions, csrf_tokens, rate_limit_attempts, todos, schema_migrations)
- Table schemas match expected structure
- All constraints are in place

**Failure Action**: If tables are missing or malformed, rollback and investigate

---

### Step 5: Verify System User

**Purpose**: Confirm system user was created

**Steps**:
```bash
# Check if system user exists
sqlite3 app.db "SELECT id, username, created_at FROM users WHERE username='system';"

# Expected output:
# system|system|2024-01-15 10:00:05

# Verify system user has no password (or placeholder)
sqlite3 app.db "SELECT username, password_hash FROM users WHERE username='system';"

# Expected output:
# system|(hash or placeholder)
```

**Success Criteria**:
- System user exists
- System user has username 'system'
- System user has a password hash

**Failure Action**: If system user is missing, manually create it

---

### Step 6: Verify Todo Migration

**Purpose**: Confirm existing todos were migrated to system user

**Steps**:
```bash
# Count todos before migration (from backup)
sqlite3 app.db.pre-migration.backup "SELECT COUNT(*) FROM todos;"

# Count todos after migration
sqlite3 app.db "SELECT COUNT(*) FROM todos;"

# Expected output:
# (same count as before)

# Verify all todos have user_id set to 'system'
sqlite3 app.db "SELECT COUNT(*) FROM todos WHERE user_id='system';"

# Expected output:
# (same as total todo count)

# Verify no todos have NULL user_id
sqlite3 app.db "SELECT COUNT(*) FROM todos WHERE user_id IS NULL;"

# Expected output:
# 0

# Sample todos to verify data integrity
sqlite3 app.db "SELECT id, title, user_id FROM todos LIMIT 5;"

# Expected output:
# 1|Buy groceries|system
# 2|Complete project|system
# 3|Call dentist|system
# ...
```

**Success Criteria**:
- Todo count is the same before and after migration
- All todos have user_id set to 'system'
- No todos have NULL user_id
- Todo data is intact (title, description, etc.)

**Failure Action**: If todos are missing or corrupted, rollback and investigate

---

### Step 7: Verify Indexes

**Purpose**: Confirm all indexes were created for performance

**Steps**:
```bash
# List all indexes
sqlite3 app.db ".indexes"

# Expected output:
# sqlite_autoindex_users_1
# idx_sessions_user_id
# idx_sessions_expires_at
# idx_csrf_tokens_session_id
# idx_rate_limit_ip_endpoint
# idx_todos_user_id

# Verify specific indexes
sqlite3 app.db "SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%';"

# Expected output:
# idx_sessions_user_id|sessions
# idx_sessions_expires_at|sessions
# idx_csrf_tokens_session_id|csrf_tokens
# idx_rate_limit_ip_endpoint|rate_limit_attempts
# idx_todos_user_id|todos
```

**Success Criteria**:
- All expected indexes exist
- Indexes are on correct tables
- Indexes are on correct columns

**Failure Action**: If indexes are missing, manually create them

---

## Post-Migration Verification

### Verification 1: Database Integrity

**Purpose**: Ensure database is still valid after migration

**Steps**:
```bash
# Run integrity check
sqlite3 app.db "PRAGMA integrity_check;"

# Expected output:
# ok
```

**Success Criteria**:
- Integrity check returns "ok"
- No errors or warnings

**Failure Action**: If integrity check fails, rollback immediately

---

### Verification 2: Foreign Key Constraints

**Purpose**: Verify referential integrity

**Steps**:
```bash
# Enable foreign key checks
sqlite3 app.db "PRAGMA foreign_keys = ON;"

# Check for orphaned records
sqlite3 app.db "SELECT COUNT(*) FROM todos WHERE user_id NOT IN (SELECT id FROM users);"

# Expected output:
# 0

# Check for orphaned sessions
sqlite3 app.db "SELECT COUNT(*) FROM sessions WHERE user_id NOT IN (SELECT id FROM users);"

# Expected output:
# 0

# Check for orphaned CSRF tokens
sqlite3 app.db "SELECT COUNT(*) FROM csrf_tokens WHERE session_id NOT IN (SELECT id FROM sessions);"

# Expected output:
# 0
```

**Success Criteria**:
- No orphaned records
- All foreign key constraints are satisfied

**Failure Action**: If orphaned records exist, investigate and clean up

---

### Verification 3: Application Startup

**Purpose**: Ensure application starts successfully after migration

**Steps**:
```bash
# Start application
sudo systemctl start todo-app

# Wait for startup
sleep 5

# Check if application is running
ps aux | grep "python.*app.py"

# Expected output:
# (running process)

# Check application logs for errors
tail -f logs/app.log

# Expected output:
# (no errors, application started successfully)
```

**Success Criteria**:
- Application starts without errors
- No error messages in logs
- Application is responsive

**Failure Action**: If application fails to start, check logs and investigate

---

### Verification 4: API Endpoints

**Purpose**: Verify API endpoints are working after migration

**Steps**:
```bash
# Test CSRF token endpoint
curl -X GET http://localhost:5000/api/auth/csrf-token

# Expected output:
# {"csrfToken":"..."}

# Test signup endpoint
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "TestPass123",
    "csrfToken": "test"
  }'

# Expected output:
# {"success":true,"message":"Account created successfully"}
# or
# {"error":"..."}

# Test login endpoint
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "TestPass123",
    "csrfToken": "test"
  }'

# Expected output:
# {"success":true,"csrfToken":"..."}
# or
# {"error":"Invalid credentials"}

# Test todos endpoint (should fail without auth)
curl -X GET http://localhost:5000/api/todos

# Expected output:
# {"error":"Not authenticated"}
```

**Success Criteria**:
- All endpoints respond
- No 500 errors
- Authentication endpoints work correctly

**Failure Action**: If endpoints fail, check logs and investigate

---

### Verification 5: Migration Log

**Purpose**: Document migration execution

**Steps**:
```bash
# Check migration log
sqlite3 app.db "SELECT * FROM migration_log;"

# Expected output:
# migration_name|status|started_at|completed_at|notes
# 001_create_users_table.sql|success|2024-01-15 10:00:00|2024-01-15 10:00:01|
# 002_create_sessions_table.sql|success|2024-01-15 10:00:01|2024-01-15 10:00:02|
# ...

# Count migrated todos
sqlite3 app.db "SELECT COUNT(*) FROM todos WHERE user_id='system';"

# Expected output:
# (number of migrated todos)

# Create migration report
cat > migration_report.txt << EOF
Migration Report
================
Date: $(date)
Database: app.db
Status: SUCCESS

Pre-Migration:
- Todos: $(sqlite3 app.db.pre-migration.backup "SELECT COUNT(*) FROM todos;")

Post-Migration:
- Users: $(sqlite3 app.db "SELECT COUNT(*) FROM users;")
- Sessions: $(sqlite3 app.db "SELECT COUNT(*) FROM sessions;")
- CSRF Tokens: $(sqlite3 app.db "SELECT COUNT(*) FROM csrf_tokens;")
- Rate Limit Attempts: $(sqlite3 app.db "SELECT COUNT(*) FROM rate_limit_attempts;")
- Todos: $(sqlite3 app.db "SELECT COUNT(*) FROM todos;")
- Todos migrated to system user: $(sqlite3 app.db "SELECT COUNT(*) FROM todos WHERE user_id='system';")

Integrity Check: $(sqlite3 app.db "PRAGMA integrity_check;")
EOF

# Display report
cat migration_report.txt
```

**Success Criteria**:
- Migration log exists
- All migrations marked as success
- Migration report generated

**Failure Action**: If migration log is missing, manually create it

---

### Post-Migration Checklist

Verify all post-migration checks:

```
[ ] Database integrity check passed
[ ] Foreign key constraints satisfied
[ ] Application started successfully
[ ] API endpoints working
[ ] Migration log created
[ ] Migration report generated
```

---

## Rollback Procedures

### Rollback Scenario 1: Migration Failed

**Symptoms**:
- Migration script returned errors
- Some migrations did not execute
- Database is in inconsistent state

**Steps**:
```bash
# 1. Stop application
sudo systemctl stop todo-app

# 2. Restore database from backup
sqlite3 app.db < app.db.pre-migration.backup

# 3. Verify restoration
sqlite3 app.db ".tables"
sqlite3 app.db "SELECT COUNT(*) FROM todos;"

# 4. Restart application
sudo systemctl start todo-app

# 5. Verify application is working
curl -X GET http://localhost:5000/api/todos
```

**Success Criteria**:
- Database is restored to pre-migration state
- Application starts successfully
- Data is intact

---

### Rollback Scenario 2: Application Won't Start

**Symptoms**:
- Application fails to start after migration
- Error messages in logs
- API endpoints not responding

**Steps**:
```bash
# 1. Check application logs
tail -f logs/app.log

# 2. Stop application
sudo systemctl stop todo-app

# 3. Restore database from backup
sqlite3 app.db < app.db.pre-migration.backup

# 4. Revert code to previous version
git checkout previous-version

# 5. Restart application
sudo systemctl start todo-app

# 6. Verify application is working
curl -X GET http://localhost:5000/api/todos
```

**Success Criteria**:
- Application starts successfully
- No error messages in logs
- API endpoints responding

---

### Rollback Scenario 3: Data Corruption

**Symptoms**:
- Todos are missing or corrupted
- Foreign key constraints violated
- Integrity check fails

**Steps**:
```bash
# 1. Stop application
sudo systemctl stop todo-app

# 2. Verify backup integrity
sqlite3 app.db.pre-migration.backup "PRAGMA integrity_check;"

# 3. Restore database from backup
sqlite3 app.db < app.db.pre-migration.backup

# 4. Verify restoration
sqlite3 app.db "PRAGMA integrity_check;"
sqlite3 app.db "SELECT COUNT(*) FROM todos;"

# 5. Restart application
sudo systemctl start todo-app

# 6. Verify data is intact
curl -X GET http://localhost:5000/api/todos
```

**Success Criteria**:
- Database integrity check passes
- All todos are restored
- Application is working

---

### Rollback Scenario 4: Performance Issues

**Symptoms**:
- Application is slow after migration
- Database queries are taking too long
- High CPU or memory usage

**Steps**:
```bash
# 1. Check database statistics
sqlite3 app.db "ANALYZE;"

# 2. Check query performance
sqlite3 app.db "EXPLAIN QUERY PLAN SELECT * FROM todos WHERE user_id='system';"

# 3. If performance is still poor, rollback
sqlite3 app.db < app.db.pre-migration.backup

# 4. Investigate performance issue
# - Check if indexes were created correctly
# - Check if statistics are up to date
# - Profile slow queries

# 5. Re-run migration after fixing performance issue
```

**Success Criteria**:
- Database performance is acceptable
- Queries complete in reasonable time
- Application is responsive

---

## Troubleshooting

### Issue 1: Migration Script Not Found

**Error Message**:
```
FileNotFoundError: [Errno 2] No such file or directory: 'migrations/001_create_users_table.sql'
```

**Solution**:
```bash
# Verify migration files exist
ls -la backend/migrations/

# If files are missing, restore from git
git checkout backend/migrations/

# Re-run migration
python -m migration_runner
```

---

### Issue 2: SQL Syntax Error

**Error Message**:
```
sqlite3.OperationalError: near "CREATE": syntax error
```

**Solution**:
```bash
# Check migration file for syntax errors
cat backend/migrations/001_create_users_table.sql

# Verify SQL syntax
sqlite3 app.db < backend/migrations/001_create_users_table.sql

# If error persists, rollback and investigate
sqlite3 app.db < app.db.pre-migration.backup
```

---

### Issue 3: Foreign Key Constraint Violation

**Error Message**:
```
sqlite3.IntegrityError: FOREIGN KEY constraint failed
```

**Solution**:
```bash
# Check for orphaned records
sqlite3 app.db "SELECT * FROM todos WHERE user_id NOT IN (SELECT id FROM users);"

# If orphaned records exist, delete them
sqlite3 app.db "DELETE FROM todos WHERE user_id NOT IN (SELECT id FROM users);"

# Re-run migration
python -m migration_runner
```

---

### Issue 4: Insufficient Disk Space

**Error Message**:
```
sqlite3.OperationalError: disk I/O error
```

**Solution**:
```bash
# Check available disk space
df -h

# Free up disk space
# - Delete old backups
# - Clear temporary files
# - Archive old logs

# Retry migration
python -m migration_runner
```

---

### Issue 5: Application Won't Connect to Database

**Error Message**:
```
sqlite3.OperationalError: unable to open database file
```

**Solution**:
```bash
# Check database file permissions
ls -l app.db

# Fix permissions if necessary
chmod 644 app.db

# Check database directory permissions
ls -ld .

# Fix directory permissions if necessary
chmod 755 .

# Verify database is accessible
sqlite3 app.db ".tables"

# Restart application
sudo systemctl restart todo-app
```

---

### Issue 6: Migration Hangs

**Symptoms**:
- Migration script is running but not completing
- No output for several minutes
- High CPU or memory usage

**Solution**:
```bash
# Kill the migration process
pkill -f migration_runner

# Check database for locks
sqlite3 app.db "PRAGMA database_list;"

# Restore from backup
sqlite3 app.db < app.db.pre-migration.backup

# Investigate the issue
# - Check for long-running queries
# - Check for deadlocks
# - Check system resources

# Retry migration
python -m migration_runner
```

---

## Post-Rollback Actions

After rollback, perform the following:

1. **Investigate Root Cause**
   - Review migration logs
   - Check error messages
   - Analyze database state

2. **Fix Issues**
   - Update migration scripts if needed
   - Fix application code if needed
   - Resolve database issues

3. **Test Migration**
   - Run migration on test database
   - Verify all checks pass
   - Test application functionality

4. **Re-attempt Migration**
   - Follow migration execution steps
   - Monitor closely for issues
   - Verify all post-migration checks

5. **Document Lessons Learned**
   - Record what went wrong
   - Document fix applied
   - Update runbook if needed

