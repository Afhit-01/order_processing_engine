import { getNextRefundId, Refunds } from "../store/refundStore.js";
import { ReturnRequests } from "../store/returnStore.js";
import type { Refund } from "../types.js";
import { updateOrderStatus } from "./orderService.js";
import { markReturnRefunded } from "./returnService.js";

export const processRefund = (
  returnId: number,
  amount: number,
): { success: true; refund: Refund } | { success: false; reason: string } => {
  const returnRequest = ReturnRequests.find((r) => r.id === returnId);

  if (!returnRequest) {
    return {
      success: false,
      reason: `Return request with id ${returnId} does not exit`,
    };
  }

  if (returnRequest.status !== "received") {
    return {
      success: false,
      reason: `Cannot process a refund for a return at status ${returnRequest.status}`,
    };
  }

  if (amount <= 0) {
    return {
      success: false,
      reason: `Refund amount must be greater than 0`,
    };
  }

  const refund: Refund = {
    id: getNextRefundId(),
    returnRequestId: returnRequest.id,
    orderId: returnRequest.orderId,
    productId: returnRequest.productId,
    amount,
    status: "pending",
    requestedAt: new Date().toISOString(),
    completedAt: null,
  };

  Refunds.push(refund);
  return { success: true, refund };
};

export const completeRefund = (
  refundId: number,
  outcome: "completed" | "failed",
): { success: true } | { success: false; reason: string } => {
  const refund = Refunds.find((r) => r.id === refundId);

  if (!refund) {
    return {
      success: false,
      reason: `Refund request with id ${refundId} does not exist`,
    };
  }

  if (refund.status !== "pending") {
    return {
      success: false,
      reason: `Cannot complete a refund already at status ${refund.status}`,
    };
  }

  if (outcome === "failed") {
    refund.status = "failed";
    return { success: true };
  }

  const returnResult = markReturnRefunded(refund.returnRequestId);

  if (!returnResult.success) {
    return returnResult;
  }

  const orderResult = updateOrderStatus(refund.orderId, "returned");

  if (!orderResult.success) {
    return orderResult;
  }

  refund.status = "completed";
  refund.completedAt = new Date().toISOString();

  return { success: true };
};
