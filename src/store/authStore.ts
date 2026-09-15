import pool from "../db/client.js";
import type { Customer, Staff, StaffRole } from "../types.js";

export const fetchStaffByEmail = async (
  email: string,
): Promise<Staff | null> => {
  const client = await pool.connect();
  try {
    const query = `
        SELECT id, email, password_hash, role
        FROM staff 
        WHERE email=$1;
    `;
    const result = await client.query(query, [email]);

    if (result.rowCount === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      role: row.role as StaffRole,
    };
  } finally {
    client.release();
  }
};

export const insertCustomer = async (
  email: string,
  passwordHash: string,
): Promise<{ id: string; email: string }> => {
  const client = await pool.connect();
  try {
    const query = `
        INSERT INTO customers (email, password_hash)
        VALUES ($1, $2) 
        RETURNING id, email;
    `;
    const result = await client.query(query, [email, passwordHash]);

    return {
      id: result.rows[0].id,
      email: result.rows[0].email,
    };
  } finally {
    client.release();
  }
};

export const fetchCustomerByEmail = async (
  email: string,
): Promise<Customer | null> => {
  const client = await pool.connect();
  try {
    const query = `
        SELECT id, email, password_hash
        FROM customers 
        WHERE email=$1;
    `;
    const result = await client.query(query, [email]);

    if (result.rowCount === 0) return null;

    const row = result.rows[0];
    return {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
    };
  } finally {
    client.release();
  }
};
