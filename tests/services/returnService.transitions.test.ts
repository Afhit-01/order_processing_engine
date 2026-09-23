import { describe, it, expect } from "vitest";
import { validReturnTransitions } from "../../src/services/returnService.js";
import type { ReturnStatus } from "../../src/types.js";

describe("Return status transition table", () => {
  it("allows a pending return to be approved or rejected", () => {
    expect(validReturnTransitions.pending).toContain("approved");
    expect(validReturnTransitions.pending).toContain("rejected");
  });

  it("does not allow a pending return to jump straight to in_transit", () => {
    expect(validReturnTransitions.pending).not.toContain("in_transit");
  });

  it("allows an approved return to move to in_transit", () => {
    expect(validReturnTransitions.approved).toContain("in_transit");
  });

  it("treats rejected as a terminal state for the return itself", () => {
    expect(validReturnTransitions.rejected).toEqual([]);
  });

  it("allows an in_transit return to be received", () => {
    expect(validReturnTransitions.in_transit).toContain("received");
  });

  it("allows a received return to move to refunded", () => {
    expect(validReturnTransitions.received).toContain("refunded");
  });

  it("does not allow a received return to skip straight back to approved", () => {
    expect(validReturnTransitions.received).not.toContain("approved");
  });

  it("treats refunded as a terminal state", () => {
    expect(validReturnTransitions.refunded).toEqual([]);
  });

  it("only defines the six known return statuses", () => {
    const expectedStatuses: ReturnStatus[] = [
      "pending", "approved", "rejected", "in_transit", "received", "refunded",
    ];
    expect(Object.keys(validReturnTransitions).sort()).toEqual([...expectedStatuses].sort());
  });
});