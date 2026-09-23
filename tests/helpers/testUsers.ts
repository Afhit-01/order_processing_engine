import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import request from "supertest";
import app from "../../src/app.js";
import pool from "../../src/db/client.js";
import type { JwtPayload, StaffRole } from "../../src/types.js";

let counter = 0;
const uniqueEmail = (prefix: string): string => {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}@example.com`;
};

const TEST_PASSWORD = "a-strong-test-password-1";

export const createStaffUser = async (
  role: StaffRole = "staff",
): Promise<{ id: string; email: string; token: string }> => {
  const email = uniqueEmail(role);
  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 12);

  await pool.query(
    `INSERT INTO staff (email, password_hash, role) VALUES ($1, $2, $3);`,
    [email, passwordHash, role],
  );

  const loginResponse = await request(app)
    .post("/auth/staff/login")
    .send({ email, password: TEST_PASSWORD });

  const token: string = loginResponse.body.token;
  const decoded = jwt.decode(token) as JwtPayload;

  return { id: decoded.id, email, token };
};

export const createCustomerUser = async (): Promise<{
  id: string;
  email: string;
  token: string;
}> => {
  const email = uniqueEmail("customer");

  await request(app)
    .post("/auth/customer/register")
    .send({ email, password: TEST_PASSWORD });

  const loginResponse = await request(app)
    .post("/auth/customer/login")
    .send({ email, password: TEST_PASSWORD });

  const token: string = loginResponse.body.token;
  const decoded = jwt.decode(token) as JwtPayload;

  return { id: decoded.id, email, token };
};