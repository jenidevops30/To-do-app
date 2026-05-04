-- Migration 006: Create system user and migrate existing todos
-- Requirement 15.1, 15.2, 15.3, 15.4: Data migration for existing todos
-- This migration:
-- 1. Creates a system user account for backward compatibility
-- 2. Associates all existing todos with the system user
-- 3. Creates a migration log table to track data migrations
-- 4. Logs the migration details including number of todos migrated

-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- Create system user account with placeholder password hash
-- The system user allows existing todos to be preserved when user login is added
INSERT OR IGNORE INTO users (
    id,
    username,
    password_hash,
    created_at,
    updated_at
)
VALUES (
    'system',
    'system',
    'system_no_password_placeholder',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Create migration log table to track data migrations
-- This table documents all data migrations performed during feature deployment
CREATE TABLE IF NOT EXISTS migration_logs (
    id TEXT PRIMARY KEY,
    migration_name TEXT NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL,
    details TEXT,
    todos_migrated INTEGER DEFAULT 0
);

-- Associate all existing todos with the system user
-- This ensures backward compatibility - existing todos are preserved
-- and accessible through the system user account
UPDATE todos
SET user_id = 'system'
WHERE user_id IS NULL OR user_id = '';

-- Log this migration with details
-- The log entry documents:
-- - Migration name and execution time
-- - Status (completed/failed)
-- - Number of todos migrated
-- - Additional details about the migration
INSERT INTO migration_logs (
    id,
    migration_name,
    status,
    details,
    todos_migrated
)
VALUES (
    'migration_006_' || strftime('%Y%m%d%H%M%S', 'now'),
    '006_create_system_user_and_migrate_todos',
    'completed',
    'System user created and all existing todos associated with system user for backward compatibility',
    (SELECT COUNT(*) FROM todos WHERE user_id = 'system')
);
