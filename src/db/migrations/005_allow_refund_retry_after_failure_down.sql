DROP INDEX refunds_return_request_id_active_unique;

ALTER TABLE refunds
  ADD CONSTRAINT refunds_return_request_id_key UNIQUE (return_request_id);
