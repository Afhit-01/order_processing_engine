ALTER TABLE idempotency_keys DROP CONSTRAINT idempotency_keys_user_key_unique;

ALTER TABLE idempotency_keys DROP COLUMN id;

ALTER TABLE idempotency_keys ADD PRIMARY KEY (idempotency_key);
