-- Migration 001: Create users table
-- Requirement 1.1, 1.2, 1.3: User account creation with validation constraints

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on username for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Constraint: username length 3-50 characters (enforced at application level)
-- Constraint: password_hash not null (enforced by NOT NULL)
-- Constraint: unique username (enforced by UNIQUE constraint)
