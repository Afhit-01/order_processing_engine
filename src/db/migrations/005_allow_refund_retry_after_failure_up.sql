-- The original UNIQUE constraint on return_request_id meant a return could
-- only ever have one refund row, ever. That's correct for preventing two
-- *live* refunds on the same return, but it also permanently blocks a retry
-- after a refund fails: the failed row keeps the unique slot occupied, so
-- processRefund's INSERT for the retry throws a unique_violation instead of
-- succeeding.
--
-- Replace the column-level UNIQUE constraint with a partial unique index
-- that ignores failed refunds, so a return can accumulate any number of
-- failed attempts but still only ever have one pending/completed refund
-- at a time.

ALTER TABLE refunds DROP CONSTRAINT refunds_return_request_id_key;

CREATE UNIQUE INDEX refunds_return_request_id_active_unique
  ON refunds (return_request_id)
  WHERE status <> 'failed';
