import type { Request, Response, NextFunction } from "express";
import pool from "../db/client.js";

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
  
    const insertQuery = `
      INSERT INTO idempotency_keys (idempotency_key, user_id, request_path, request_method)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, idempotency_key) DO NOTHING
      RETURNING id;
    `;
    const insertResult = await pool.query(insertQuery, [
      idempotencyKey,
      req.user!.id,
      req.path,
      req.method,
    ]);

    if (insertResult.rowCount === 0) {
      // We lost the race, or this key was already used earlier. Either way, look at the existing row to decide what to tell the caller.
      const existingQuery = `
        SELECT status, response_code, response_body FROM idempotency_keys
        WHERE user_id = $1 AND idempotency_key = $2;
      `;
      const existing = await pool.query(existingQuery, [
        req.user!.id,
        idempotencyKey,
      ]);
      const row = existing.rows[0];

      if (row?.status === "in_progress") {
        return res.status(409).json({
          error: "A concurrent request is already being processed",
        });
      }

      if (row?.status === "completed") {
        const statusCode = row.response_code ?? 200;
        return res.status(statusCode).json(row.response_body);
      }
    }

    const originalJson = res.json;

    res.json = function (body) {
      res.json = originalJson;

      const updateQuery = `
        UPDATE idempotency_keys
        SET response_code = $1, response_body = $2, status = 'completed'
        WHERE idempotency_key = $3 AND user_id = $4;
      `;

      const updatePromise = pool.query(updateQuery, [
        res.statusCode,
        body,
        idempotencyKey,
        req.user!.id,
      ]);

      updatePromise.catch((err) => {
        console.error("Idempotency update error:", err);
      });

      return originalJson.call(this, body);
    };

    next();
  } catch (error) {
    console.error("Idempotency Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

