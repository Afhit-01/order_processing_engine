import { describe, it, expect } from "vitest";
import { validTransitions } from "../../src/services/orderService.js";
import type { OrderStatus } from "../../src/types.js";

describe("Order status transition table", () => {
  it("allows a pending order to move to confirmed", () => {
    expect(validTransitions.pending).toContain("confirmed");
  });

  it("does not allow a pending order to jump straight to shipped", () => {
    expect(validTransitions.pending).not.toContain("shipped");
  });

  it("allows a pending order to be cancelled", () => {
    expect(validTransitions.pending).toContain("cancelled");
  });

  it("allows a confirmed order to move to shipped or cancelled", () => {
    expect(validTransitions.confirmed).toContain("shipped");
    expect(validTransitions.confirmed).toContain("cancelled");
  });

  it("allows a shipped order to move to delivered", () => {
    expect(validTransitions.shipped).toContain("delivered");
  });

  it("does not allow a shipped order to be cancelled", () => {
    expect(validTransitions.shipped).not.toContain("cancelled");
  });

  it("allows a delivered order to move to return_requested", () => {
    expect(validTransitions.delivered).toContain("return_requested");
  });

  it("allows return_requested to resolve as returned or fall back to delivered", () => {
    expect(validTransitions.return_requested).toContain("returned");
    expect(validTransitions.return_requested).toContain("delivered");
  });

  it("treats cancelled as a terminal state", () => {
    expect(validTransitions.cancelled).toEqual([]);
  });

  it("treats returned as a terminal state", () => {
    expect(validTransitions.returned).toEqual([]);
  });

  it("only defines the seven known order statuses", () => {
    const expectedStatuses: OrderStatus[] = [
      "pending", "confirmed", "shipped", "delivered",
      "cancelled", "return_requested", "returned",
    ];
    expect(Object.keys(validTransitions).sort()).toEqual([...expectedStatuses].sort());
  });
});