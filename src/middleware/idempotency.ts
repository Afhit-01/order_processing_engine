import type { Request, Response, NextFunction } from "express";
import pool from "../db/client.js";
import type { IdempotencyRecord } from "../types.js";

export const checkIdempotency = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const idempotencyKey = req.headers["idempotency-key"] as string;

  if (!idempotencyKey) {
    return res.status(400).json({
      error: "Idempotency key is required",
    });
  }

  try {
    const query = `
      SELECT * FROM idempotency_keys
      WHERE user_id = $1
      AND idempotency_key = $2;
    `;
    const result = await pool.query(query, [req.user!.id, idempotencyKey]);

    if (result.rowCount !== 0) {
      const row: IdempotencyRecord = result.rows[0];

      if (row.status === "in_progress") {
        return res.status(409).json({
          error: "A concurrent request is already being processed",
        });
      }

      if (row.status === "completed") {
        // Fallback to 200 if for some reason it is null
        const statusCode = row.response_code ?? 200;
        return res.status(statusCode).json(row.response_body);
      }
    }

    // If we reach here, it is a new request. Huh...?

    const insertQuery = `
      INSERT INTO idempotency_keys (idempotency_key, user_id, request_path, request_method)
      VALUES ($1, $2, $3, $4);
    `;
    await pool.query(insertQuery, [
      idempotencyKey,
      req.user!.id,
      req.path,
      req.method,
    ]);

    const originalJson = res.json;

    // (Interceptor logic will go here)

    next();
  } catch (error) {
    console.error("Idempotency Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
