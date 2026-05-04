-- Rollback for Migration 001: Drop users table
-- This rollback removes the users table and its indexes

DROP INDEX IF EXISTS idx_users_username;
DROP TABLE IF EXISTS users;
