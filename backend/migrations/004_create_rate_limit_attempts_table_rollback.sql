-- Rollback for Migration 004: Drop rate_limit_attempts table
-- This rollback removes the rate_limit_attempts table and its indexes

DROP INDEX IF EXISTS idx_rate_limit_ip_endpoint;
DROP TABLE IF EXISTS rate_limit_attempts;
