-- Rollback for Migration 002: Drop sessions table
-- This rollback removes the sessions table and its indexes

DROP INDEX IF EXISTS idx_sessions_expires_at;
DROP INDEX IF EXISTS idx_sessions_user_id;
DROP TABLE IF EXISTS sessions;
