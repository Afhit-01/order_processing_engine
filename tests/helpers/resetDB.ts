import pool from "../../src/db/client.js";

export const resetDb = async (): Promise<void> => {
  await pool.query(`
    TRUNCATE TABLE
      idempotency_keys,
      refunds,
      return_requests,
      order_items,
      orders,
      customers,
      staff
    CASCADE;
  `);
};
