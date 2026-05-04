-- Migration 004: Create rate_limit_attempts table
-- Requirement 12.1, 12.2, 12.4: Rate limiting on authentication endpoints

CREATE TABLE IF NOT EXISTS rate_limit_attempts (
    id TEXT PRIMARY KEY,
    ip_address TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    attempt_count INTEGER DEFAULT 1,
    first_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_attempt_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    blocked_until TIMESTAMP
);

-- Create index for efficient rate limit lookups by IP and endpoint
CREATE INDEX IF NOT EXISTS idx_rate_limit_ip_endpoint 
ON rate_limit_attempts(ip_address, endpoint);

-- Constraint: ip_address not null (enforced by NOT NULL)
-- Constraint: endpoint not null (enforced by NOT NULL)
-- Constraint: attempt_count defaults to 1 (enforced by DEFAULT)
