-- Rollback for Migration 005: Remove user_id from todos table
-- This rollback removes the user_id column, its index, and foreign key constraint

-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- Create a temporary table with the old schema (without user_id)
CREATE TABLE todos_temp (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    completed BOOLEAN NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);

-- Copy data from the original table (excluding user_id)
INSERT INTO todos_temp (id, title, description, completed, created_at, updated_at)
SELECT id, title, description, completed, created_at, updated_at FROM todos;

-- Drop the original table
DROP TABLE todos;

-- Rename the temporary table
ALTER TABLE todos_temp RENAME TO todos;

-- Recreate the original indexes
CREATE INDEX IF NOT EXISTS idx_completed ON todos(completed);
CREATE INDEX IF NOT EXISTS idx_created_at ON todos(created_at DESC);
