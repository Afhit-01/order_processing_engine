CREATE TABLE idempotency_keys (
    idempotency_key VARCHAR(255) PRIMARY KEY,
    user_id UUID NOT NULL,
    request_path VARCHAR(255) NOT NULL,
    request_method VARCHAR(10) NOT NULL,
    response_code INTEGER,
    response_body JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'in_progress',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index to help quickly clean up keys older than 24-48 hours
CREATE INDEX idx_idempotency_created_at ON idempotency_keys(created_at);