import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import pool from "../../src/db/client.js";
import { resetDb } from "../helpers/resetDB.js";
import { createCustomerUser } from "../helpers/testUsers.js";

beforeEach(async () => {
  await resetDb();
});

afterAll(async () => {
  await pool.end();
});

const sampleItems = [
  { productId: "sku-1", name: "Keyboard", unitPrice: 15000, quantity: 1 },
];

describe("Idempotency", () => {
  it("rejects a mutating request with no Idempotency-Key header", async () => {
    const customer = await createCustomerUser();
    const response = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ items: sampleItems });
    expect(response.status).toBe(400);
  });

  it("creates exactly one order when the same key is sent twice", async () => {
    const customer = await createCustomerUser();

    const first = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${customer.token}`)
      .set("Idempotency-Key", "same-key-twice")
      .send({ items: sampleItems });

    const second = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${customer.token}`)
      .set("Idempotency-Key", "same-key-twice")
      .send({ items: sampleItems });

    expect(second.status).toBe(first.status);
    expect(second.body).toEqual(first.body);

    const { rows } = await pool.query(
      `SELECT COUNT(*) FROM orders WHERE customer_id = $1;`,
      [customer.id],
    );
    expect(Number(rows[0].count)).toBe(1);
  });

  it("lets two different customers use the same key value independently", async () => {
    const customerA = await createCustomerUser();
    const customerB = await createCustomerUser();

    const responseA = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${customerA.token}`)
      .set("Idempotency-Key", "shared-key-value")
      .send({ items: sampleItems });

    const responseB = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${customerB.token}`)
      .set("Idempotency-Key", "shared-key-value")
      .send({ items: sampleItems });

    expect(responseA.status).toBe(201);
    expect(responseB.status).toBe(201);
    expect(responseA.body.id).not.toBe(responseB.body.id);
  });

  it("returns 409 when a concurrent duplicate request is still in flight", async () => {
    const customer = await createCustomerUser();

    const [first, second] = await Promise.all([
      request(app)
        .post("/orders")
        .set("Authorization", `Bearer ${customer.token}`)
        .set("Idempotency-Key", "concurrent-key")
        .send({ items: sampleItems }),
      request(app)
        .post("/orders")
        .set("Authorization", `Bearer ${customer.token}`)
        .set("Idempotency-Key", "concurrent-key")
        .send({ items: sampleItems }),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([201, 409]);
  });
});
