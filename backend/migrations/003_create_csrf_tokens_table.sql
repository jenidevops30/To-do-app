-- Migration 003: Create csrf_tokens table
-- Requirement 11.1, 11.3, 11.4: CSRF protection with per-session tokens

CREATE TABLE IF NOT EXISTS csrf_tokens (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

-- Create index for efficient CSRF token lookups by session
CREATE INDEX IF NOT EXISTS idx_csrf_tokens_session_id ON csrf_tokens(session_id);

-- Constraint: session_id must reference valid session (enforced by FOREIGN KEY)
-- Constraint: token_hash not null (enforced by NOT NULL)
-- Constraint: expires_at not null (enforced by NOT NULL)
