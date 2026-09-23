import { describe, it, expect, beforeEach, afterAll } from "vitest";
import request from "supertest";
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

const sampleItems = [
  { productId: "sku-1", name: "Keyboard", unitPrice: 15000, quantity: 1 },
];

describe("Data isolation between customers", () => {
  it("does not let customer B fetch customer A's order by id", async () => {
    const customerA = await createCustomerUser();
    const customerB = await createCustomerUser();

    const createResponse = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${customerA.token}`)
      .set("Idempotency-Key", "isolation-test-create-1")
      .send({ items: sampleItems });

    const orderId = createResponse.body.id;

    const asOwner = await request(app)
      .get(`/orders/${orderId}`)
      .set("Authorization", `Bearer ${customerA.token}`);
    const asStranger = await request(app)
      .get(`/orders/${orderId}`)
      .set("Authorization", `Bearer ${customerB.token}`);

    expect(asOwner.status).toBe(200);
    expect(asStranger.status).toBe(404);
  });

  it("does not include customer A's orders in customer B's status listing", async () => {
    const customerA = await createCustomerUser();
    const customerB = await createCustomerUser();

    await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${customerA.token}`)
      .set("Idempotency-Key", "isolation-test-create-2")
      .send({ items: sampleItems });

    const response = await request(app)
      .get("/orders?status=pending")
      .set("Authorization", `Bearer ${customerB.token}`);

    expect(response.body).toEqual([]);
  });

  it("does not let customer B cancel customer A's order", async () => {
    const customerA = await createCustomerUser();
    const customerB = await createCustomerUser();

    const createResponse = await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${customerA.token}`)
      .set("Idempotency-Key", "isolation-test-create-3")
      .send({ items: sampleItems });

    const orderId = createResponse.body.id;

    const cancelAttempt = await request(app)
      .delete(`/orders/${orderId}`)
      .set("Authorization", `Bearer ${customerB.token}`);

    expect(cancelAttempt.status).not.toBe(200);

    const stillThere = await request(app)
      .get(`/orders/${orderId}`)
      .set("Authorization", `Bearer ${customerA.token}`);

    expect(stillThere.body.status).toBe("pending");
  });

  it("lets staff see across customers, unlike a customer", async () => {
    const customerA = await createCustomerUser();
    const staff = await createStaffUser("staff");

    await request(app)
      .post("/orders")
      .set("Authorization", `Bearer ${customerA.token}`)
      .set("Idempotency-Key", "isolation-test-create-4")
      .send({ items: sampleItems });

    const response = await request(app)
      .get("/orders?status=pending")
      .set("Authorization", `Bearer ${staff.token}`);

    expect(response.body.length).toBeGreaterThan(0);
  });
});
