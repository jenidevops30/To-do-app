-- Rollback for Migration 003: Drop csrf_tokens table
-- This rollback removes the csrf_tokens table and its indexes

DROP INDEX IF EXISTS idx_csrf_tokens_session_id;
DROP TABLE IF EXISTS csrf_tokens;
