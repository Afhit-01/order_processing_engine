import pool from "../db/client.js";
import type { Order, OrderItem, OrderStatus } from "../types.js";

export const insertOrder = async (
  customerName: string,
  items: OrderItem[],
): Promise<Order> => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const orderQuery = `INSERT INTO orders (customer_name, status) VALUES ($1, $2) RETURNING id, customer_name, status, created_at;`;
    const orderResult = await client.query(orderQuery, [
      customerName,
      "pending",
    ]);
    const savedOrder = orderResult.rows[0];

    for (const item of items) {
      const itemQuery = `
    INSERT INTO order_items (order_id, product_id, name, quantity, unit_price) 
    VALUES ($1, $2, $3, $4, $5);
  `;
      await client.query(itemQuery, [
        savedOrder.id,
        item.productId,
        item.name,
        item.quantity,
        item.unitPrice,
      ]);
    }

    await client.query("COMMIT");

    return {
      id: savedOrder.id,
      customerName: savedOrder.customer_name,
      items,
      status: savedOrder.status,
      createdAt: savedOrder.created_at,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

export const updateOrderStatusInDb = async (
  id: string,
  newStatus: OrderStatus,
) => {
  const client = await pool.connect();
  try {
    const updateQuery = `UPDATE orders SET status = $1 WHERE id = $2;`;
    await client.query(updateQuery, [newStatus, id]);
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
};

export const getOrderByIdFromDb = async (id: string): Promise<Order | null> => {
  const client = await pool.connect();
  try {
    const orderQuery = `SELECT id, customer_name, status, created_at FROM orders WHERE id = $1;`;
    const orderResult = await client.query(orderQuery, [id]);

    if (orderResult.rows.length === 0) {
      return null; // Order doesn't exist
    }

    const row = orderResult.rows[0];

    const itemsQuery = `SELECT product_id, name, quantity, unit_price FROM order_items WHERE order_id = $1;`;
    const itemsResult = await client.query(itemsQuery, [id]);

    const order: Order = {
      id: row.id,
      customerName: row.customer_name,
      status: row.status,
      createdAt: row.created_at,
      items: itemsResult.rows.map((itemRow) => ({
        productId: itemRow.product_id,
        name: itemRow.name,
        quantity: itemRow.quantity,
        unitPrice: Number(itemRow.unit_price),
      })),
    };

    return order;
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
};

export const getOrdersByStatusFromDb = async (status: OrderStatus): Promise<Order[]> => {
  const client = await pool.connect();
  try {
    const orderQuery = `SELECT id, customer_name, status, created_at FROM orders WHERE status = $1;`;
    const orderResult = await client.query(orderQuery, [status]);

    const orders: Order[] = [];

    for (const row of orderResult.rows) {
      const itemsQuery = `SELECT product_id, name, quantity, unit_price FROM order_items WHERE order_id = $1;`;
      const itemsResult = await client.query(itemsQuery, [row.id]);

      orders.push({
        id: row.id,
        customerName: row.customer_name,
        status: row.status,
        createdAt: row.created_at,
        items: itemsResult.rows.map((itemRow) => ({
          productId: itemRow.product_id,
          name: itemRow.name,
          quantity: itemRow.quantity,
          unitPrice: Number(itemRow.unit_price),
        })),
      });
    }

    return orders;
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
};

export const getOrderReportFromId = async (): Promise<{
  totalOrders: number;
  byStatus: Record<OrderStatus, number>;
  revenue: number;
}> => {
  const client = await pool.connect();
  try {

    const statusCountQuery = `
      SELECT status, COUNT(*) as count 
      FROM orders 
      GROUP BY status;
    `;
    const statusResult = await client.query(statusCountQuery);

    const byStatus: Record<OrderStatus, number> = {
      pending: 0,
      confirmed: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0,
      return_requested: 0,
      returned: 0,
    };

    let totalOrders = 0;
    for (const row of statusResult.rows) {
      const count = Number(row.count);
      byStatus[row.status as OrderStatus] = count;
      totalOrders += count;
    }

    const revenueQuery = `culate revenue directly in SQL for completed 
      SELECT SUM(oi.quantity * oi.unit_price) as total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status IN ('confirmed', 'shipped', 'delivered');
    `;
    const revenueResult = await client.query(revenueQuery);
    const revenue = Number(revenueResult.rows[0].total_revenue || 0);

    return { totalOrders, byStatus, revenue };
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
};