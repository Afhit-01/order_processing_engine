ALTER TABLE refunds DROP CONSTRAINT refunds_return_request_id_key;

CREATE UNIQUE INDEX refunds_return_request_id_active_unique
  ON refunds (return_request_id)
  WHERE status <> 'failed';
