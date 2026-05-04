-- Migration 005: Enhance todos table with user_id
-- Requirement 5.1, 5.2, 5.3, 5.4, 5.5, 5.6: User-specific todo list access
-- Adds user_id column with foreign key constraint and index

-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- Create a temporary table with the new schema including user_id
CREATE TABLE todos_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    completed BOOLEAN NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    user_id TEXT NOT NULL DEFAULT 'system',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Copy data from the original table to the new table
INSERT INTO todos_new (id, title, description, completed, created_at, updated_at, user_id)
SELECT id, title, description, completed, created_at, updated_at, 'system' FROM todos;

-- Drop the original table
DROP TABLE todos;

-- Rename the new table to todos
ALTER TABLE todos_new RENAME TO todos;

-- Recreate indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_completed ON todos(completed);
CREATE INDEX IF NOT EXISTS idx_created_at ON todos(created_at DESC);

-- Create index on user_id for efficient user-scoped queries
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
