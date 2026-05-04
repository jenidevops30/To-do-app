-- Rollback for Migration 000: Drop todos table
-- This rollback removes the todos table and its indexes

DROP INDEX IF EXISTS idx_created_at;
DROP INDEX IF EXISTS idx_completed;
DROP TABLE IF EXISTS todos;
