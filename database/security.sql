-- Additive and repeatable: existing users, media and orders are preserved.
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;
CREATE TABLE IF NOT EXISTS auth_challenges (
 id UUID PRIMARY KEY,
 email VARCHAR(254) NOT NULL,
 purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('register','login','reset','email')),
 code_hash CHAR(64) NOT NULL,
 payload JSONB NOT NULL DEFAULT '{}',
 attempts INTEGER NOT NULL DEFAULT 0,
 expires_at TIMESTAMPTZ NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_auth_challenges_expiry ON auth_challenges(expires_at);
CREATE TABLE IF NOT EXISTS auth_delivery_limits (
 email_key CHAR(64) PRIMARY KEY,
 window_start TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 last_sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 sends INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS wishlists (
 user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 slug VARCHAR(160) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY (user_id, slug)
);
