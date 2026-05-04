-- Migration 002: Create sessions table
-- Requirement 2.5, 3.1, 3.2, 3.3, 3.4, 3.6: Session management and token validation

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for efficient session lookups
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- Constraint: user_id must reference valid user (enforced by FOREIGN KEY)
-- Constraint: token_hash not null (enforced by NOT NULL)
-- Constraint: expires_at not null (enforced by NOT NULL)
