import pool from "../db/client.js";
import type { Refund, RefundStatus } from "../types.js";

export const insertRefund = async (
  returnRequestId: string,
  orderId: string,
  productId: string,
  amount: number,
): Promise<Refund> => {
  const client = await pool.connect();
  try {
    const query = `
      INSERT INTO refunds (return_request_id, order_id, product_id, amount, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, return_request_id, order_id, product_id, amount, status, requested_at, completed_at;
    `;
    const result = await client.query(query, [
      returnRequestId,
      orderId,
      productId,
      amount,
      "pending",
    ]);
    const row = result.rows[0];

    return {
      id: row.id,
      returnRequestId: row.return_request_id,
      orderId: row.order_id,
      productId: row.product_id,
      amount: Number(row.amount),
      status: row.status as RefundStatus,
      requestedAt: row.requested_at,
      completedAt: row.completed_at,
    };
  } finally {
    client.release();
  }
};

export const getRefundByIdFromDB = async (
  refundID: string,
): Promise<Refund | null> => {
  const client = await pool.connect();
  try {
    const query = `
        SELECT return_request_id, order_id, product_id, amount, status, requested_at, completed_at
        FROM refunds WHERE id=$1;
        `;

    const result = await client.query(query, [refundID]);

    if (result.rowCount === 0) return null;

    const row = result.rows[0];
    return {
      id: refundID,
      returnRequestId: row.return_request_id,
      orderId: row.order_id,
      productId: row.product_id,
      amount: Number(row.amount),
      status: row.status as RefundStatus,
      requestedAt: row.requested_at,
      completedAt: row.completed_at,
    };
  } finally {
    client.release();
  }
};

export const updateRefundStatusInDb = async (
  id: string,
  status: RefundStatus,
  completedAt: string | null = null,
): Promise<void> => {
  const client = await pool.connect();
  try {
    const query = `
      UPDATE refunds 
      SET status = $1, completed_at = $2 
      WHERE id = $3;
    `;
    await client.query(query, [status, completedAt, id]);
  } finally {
    client.release();
  }
};