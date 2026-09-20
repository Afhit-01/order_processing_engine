-- The original primary key was idempotency_key alone, which meant two
-- different users reusing the same key string by coincidence would
-- collide with each other. The uniqueness should be scoped per user.

ALTER TABLE idempotency_keys DROP CONSTRAINT idempotency_keys_pkey;

ALTER TABLE idempotency_keys ADD COLUMN id UUID PRIMARY KEY DEFAULT gen_random_uuid();

ALTER TABLE idempotency_keys
  ADD CONSTRAINT idempotency_keys_user_key_unique UNIQUE (user_id, idempotency_key);
