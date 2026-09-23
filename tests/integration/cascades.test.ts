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

const productId = "God-when-1";

const createDeliveredOrder = async (
  customerToken: string,
  staffToken: string,
  idempotencyKey: string,
): Promise<string> => {
  const createResponse = await request(app)
    .post("/orders")
    .set("Authorization", `Bearer ${customerToken}`)
    .set("Idempotency-Key", idempotencyKey)
    .send({
      items: [{ productId, name: "Keyboard", unitPrice: 15000, quantity: 1 }],
    });

  const orderId = createResponse.body.id;

  for (const status of ["confirmed", "shipped", "delivered"]) {
    await request(app)
      .patch(`/orders/${orderId}/status`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ status });
  }

  return orderId;
};

describe("Return rejection cascade", () => {
  it("sends the order back to delivered when a return is rejected", async () => {
    const customer = await createCustomerUser();
    const staff = await createStaffUser("staff");

    const orderId = await createDeliveredOrder(
      customer.token,
      staff.token,
      "cascade-reject-create",
    );

    await request(app)
      .patch(`/return/${orderId}/${productId}/1`)
      .set("Authorization", `Bearer ${customer.token}`)
      .send({ reason: "Changed my mind" });

    const afterRequest = await request(app)
      .get(`/orders/${orderId}`)
      .set("Authorization", `Bearer ${customer.token}`);
    expect(afterRequest.body.status).toBe("return_requested");

    await request(app)
      .patch(`/return/${orderId}/${productId}/review`)
      .set("Authorization", `Bearer ${staff.token}`)
      .send({ review: "rejected" });

    const afterRejection = await request(app)
      .get(`/orders/${orderId}`)
      .set("Authorization", `Bearer ${customer.token}`);

    expect(afterRejection.body.status).toBe("delivered");
  });
});

describe("Refund completion cascade", () => {
  const walkReturnToReceived = async (
    orderId: string,
    customerToken: string,
    staffToken: string,
  ) => {
    await request(app)
      .patch(`/return/${orderId}/${productId}/1`)
      .set("Authorization", `Bearer ${customerToken}`)
      .send({ reason: "Wrong size" });

    await request(app)
      .patch(`/return/${orderId}/${productId}/review`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ review: "approved" });

    await request(app)
      .patch(`/return/${orderId}/${productId}/ship`)
      .set("Authorization", `Bearer ${staffToken}`);

    await request(app)
      .patch(`/return/${orderId}/${productId}/receive`)
      .set("Authorization", `Bearer ${staffToken}`);
  };

  it("moves the order to returned once a refund completes", async () => {
    const customer = await createCustomerUser();
    const staff = await createStaffUser("staff");

    const orderId = await createDeliveredOrder(
      customer.token,
      staff.token,
      "cascade-complete-create",
    );
    await walkReturnToReceived(orderId, customer.token, staff.token);

    const refundResponse = await request(app)
      .post(`/return/${orderId}/${productId}/refund`)
      .set("Authorization", `Bearer ${staff.token}`)
      .set("Idempotency-Key", "cascade-complete-refund")
      .send({ refundAmount: 15000 });

    const refundId = refundResponse.body.refund.id;

    await request(app)
      .patch(`/refunds/${refundId}/complete`)
      .set("Authorization", `Bearer ${staff.token}`)
      .set("Idempotency-Key", "cascade-complete-finish")
      .send({ outcome: "completed" });

    const afterCompletion = await request(app)
      .get(`/orders/${orderId}`)
      .set("Authorization", `Bearer ${customer.token}`);

    expect(afterCompletion.body.status).toBe("returned");
  });

  it("leaves the order and return untouched when a refund fails, allowing a retry", async () => {
    const customer = await createCustomerUser();
    const staff = await createStaffUser("staff");

    const orderId = await createDeliveredOrder(
      customer.token,
      staff.token,
      "cascade-fail-create",
    );
    await walkReturnToReceived(orderId, customer.token, staff.token);

    const refundResponse = await request(app)
      .post(`/return/${orderId}/${productId}/refund`)
      .set("Authorization", `Bearer ${staff.token}`)
      .set("Idempotency-Key", "cascade-fail-refund")
      .send({ refundAmount: 15000 });

    const refundId = refundResponse.body.refund.id;

    await request(app)
      .patch(`/refunds/${refundId}/complete`)
      .set("Authorization", `Bearer ${staff.token}`)
      .set("Idempotency-Key", "cascade-fail-finish")
      .send({ outcome: "failed" });

    const afterFailure = await request(app)
      .get(`/orders/${orderId}`)
      .set("Authorization", `Bearer ${customer.token}`);
    expect(afterFailure.body.status).toBe("return_requested");

    const retryResponse = await request(app)
      .post(`/return/${orderId}/${productId}/refund`)
      .set("Authorization", `Bearer ${staff.token}`)
      .set("Idempotency-Key", "cascade-fail-retry")
      .send({ refundAmount: 15000 });

    expect(retryResponse.status).toBe(200);
  });
});
