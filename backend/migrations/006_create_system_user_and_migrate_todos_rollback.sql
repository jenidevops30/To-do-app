-- Rollback for Migration 006: Remove system user and migration logs
-- This rollback:
-- 1. Removes the migration log entry
-- 2. Drops the migration log table
-- 3. Removes the system user account
-- Note: This will cascade delete all todos associated with the system user
-- due to the ON DELETE CASCADE foreign key constraint

-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- Delete the migration log entry for this migration
DELETE FROM migration_logs
WHERE migration_name = '006_create_system_user_and_migrate_todos';

-- Drop the migration log table if it exists
DROP TABLE IF EXISTS migration_logs;

-- Delete the system user account
-- This will cascade delete all todos associated with the system user
-- due to the ON DELETE CASCADE constraint on the foreign key
DELETE FROM users WHERE id = 'system';
