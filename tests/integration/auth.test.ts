import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import jwt from "jsonwebtoken";
import app from "../../src/app.js";
import pool from "../../src/db/client.js";
import { resetDb } from "../helpers/resetDB.js";
import { createCustomerUser, createStaffUser } from "../helpers/testUsers.js";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await pool.end();
});

describe("Auth boundary", () => {
  it("rejects a request with no token at all", async () => {
    const response = await request(app).get("/orders?status=pending");
    expect(response.status).toBe(401);
  });

  it("rejects a request with a malformed Authorization header", async () => {
    const response = await request(app)
      .get("/orders?status=pending")
      .set("Authorization", "not-the-bearer-scheme");
    expect(response.status).toBe(401);
  });

  it("rejects an expired token", async () => {
    const { id } = await createCustomerUser();
    const expiredToken = jwt.sign(
      { id, role: "customer" },
      process.env.JWT_SECRET!,
      { expiresIn: -1 },
    );
    const response = await request(app)
      .get("/orders?status=pending")
      .set("Authorization", `Bearer ${expiredToken}`);
    expect(response.status).toBe(401);
  });

  it("rejects a token signed with the wrong secret", async () => {
    const forgedToken = jwt.sign(
      { id: "00000000-0000-0000-0000-000000000000", role: "admin" },
      "not-the-real-secret",
    );
    const response = await request(app)
      .get("/orders?status=pending")
      .set("Authorization", `Bearer ${forgedToken}`);
    expect(response.status).toBe(401);
  });

  it("accepts a valid customer token on a customer-accessible route", async () => {
    const { token } = await createCustomerUser();
    const response = await request(app)
      .get("/orders?status=pending")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);
  });

  it("blocks a customer from the staff-only order report", async () => {
    const { token } = await createCustomerUser();
    const response = await request(app)
      .get("/orders/report")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(403);
  });

  it("allows staff to reach the order report", async () => {
    const { token } = await createStaffUser("staff");
    const response = await request(app)
      .get("/orders/report")
      .set("Authorization", `Bearer ${token}`);
    expect(response.status).toBe(200);
  });

  it("blocks a customer from changing an order's status", async () => {
    const { token } = await createCustomerUser();
    const response = await request(app)
      .patch("/orders/00000000-0000-0000-0000-000000000000/status")
      .set("Authorization", `Bearer ${token}`)
      .send({ status: "confirmed" });
    expect(response.status).toBe(403);
  });

  it("does not reveal whether a staff email exists on a failed login", async () => {
    const unregisteredResponse = await request(app)
      .post("/auth/staff/login")
      .send({ email: "nobody@example.com", password: "whatever" });
    const { email } = await createStaffUser("staff");
    const wrongPasswordResponse = await request(app)
      .post("/auth/staff/login")
      .send({ email, password: "the-wrong-password" });
    expect(unregisteredResponse.body.error).toBe(wrongPasswordResponse.body.error);
  });

  it("does not reveal whether a customer email exists on a failed login", async () => {
    const unregisteredResponse = await request(app)
      .post("/auth/customer/login")
      .send({ email: "nobody@example.com", password: "whatever" });
    const { email } = await createCustomerUser();
    const wrongPasswordResponse = await request(app)
      .post("/auth/customer/login")
      .send({ email, password: "the-wrong-password" });
    expect(unregisteredResponse.body.error).toBe(wrongPasswordResponse.body.error);
  });
});