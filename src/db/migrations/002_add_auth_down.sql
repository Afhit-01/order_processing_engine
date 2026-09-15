-- Revert orders table to its previous state
ALTER TABLE orders DROP COLUMN customer_id;
ALTER TABLE orders ADD COLUMN customer_name VARCHAR(255) NOT NULL DEFAULT 'Unknown Customer';


DROP TABLE IF EXISTS staff;
DROP TABLE IF EXISTS customers;