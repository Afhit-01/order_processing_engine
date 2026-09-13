import pool from "../db/client.js";
import type { ReturnRequest } from "../types.js";

export const insertReturnRequest = async (
  orderId: string,
  productId: string,
  quantity: number,
  reason: string,
): Promise<ReturnRequest> => {
  const client = await pool.connect();
  try {
    const query = `
    INSERT INTO return_requests (order_id, product_id, quantity, reason, status)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING id, order_id, product_id, quantity, reason, status, created_at;
    `;

    const result = await client.query(query, [
      orderId,
      productId,
      quantity,
      reason,
      "pending",
    ]);

    const row = result.rows[0];

    return {
      id: row.id,
      orderId: row.order_id,
      productId: row.product_id,
      quantity: row.quantity,
      reason: row.reason,
      status: row.status,
      requestedAt: row.created_at,
    };
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
};

export const getReturnByIdFromDB = async (
  id: string,
): Promise<ReturnRequest | null> => {
  const client = await pool.connect();

  try {
    const getQuery = `
        SELECT order_id, product_id, quantity, reason, status, created_at
        FROM return_requests WHERE id=$1;
        `;

    const result = await client.query(getQuery, [id]);

    if (result.rowCount === 0) return null;

    const row = result.rows[0];

    return {
      id: id,
      orderId: row.order_id,
      productId: row.product_id,
      quantity: row.quantity,
      reason: row.reason,
      status: row.status,
      requestedAt: row.created_at,
    };
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
};

export const updateReturnRequestInDB = async (id: string, decision: string) => {
  const client = await pool.connect();

  try {
    const query = `
        UPDATE return_requests SET status = $1 WHERE id = $2;`;
    await client.query(query, [decision, id]);
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
};
