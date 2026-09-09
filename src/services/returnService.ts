import { Orders } from "../store/orderStore.js";
import { ReturnRequests, getNextReturnId } from "../store/returnStore.js";
import { createReturnRequest } from "../returnLogic.js";
import { updateOrderStatus } from "./orderService.js";
import type { Refund, ReturnStatus } from "../types.js";

export const validReturnTransitions: Record<ReturnStatus, ReturnStatus[]> = {
  pending: ["approved", "rejected"],
  approved: ["in_transit"],
  rejected: [],
  in_transit: ["received"],
  received: ["refunded"],
  refunded: [],
};

export const returnOrder = (
  orderId: number,
  productId: number,
  quantity: number,
  reason: string,
): { success: true; message: string } | { success: false; reason: string } => {
  const order = Orders.find((order) => order.id === orderId);
  if (!order) {
    return { success: false, reason: `Order with id ${orderId} was not found` };
  }

  if (order.status !== "delivered") {
    return {
      success: false,
      reason:
        "Can't return this item yet. You can request a return after it has been delivered.",
    };
  }

  const foundSpecificItem = order.items.some(
    (item) => item.productId === productId,
  );
  if (!foundSpecificItem) {
    return {
      success: false,
      reason: `Item with id ${productId} does not exist in order ${orderId}`,
    };
  }

  const millisecondsPerDay = 1000 * 24 * 60 * 60;
  const daysSinceCreated = Math.floor(
    (Date.now() - new Date(order.createdAt).getTime()) / millisecondsPerDay,
  );

  if (daysSinceCreated > 30) {
    return {
      success: false,
      reason:
        "Return period has expired. You can only return items within 30 days of delivery.",
    };
  }

  const returnedItem = createReturnRequest(
    getNextReturnId(),
    orderId,
    productId,
    quantity,
    reason,
  );
  ReturnRequests.push(returnedItem);

  const statusResult = updateOrderStatus(orderId, "return_requested");
  if (!statusResult.success) return statusResult;

  return {
    success: true,
    message: "Your return request has been received and is under review",
  };
};

export const reviewReturn = (
  returnId: number,
  decision: "approved" | "rejected",
): { success: true } | { success: false; reason: string } => {
  const returnRequest = ReturnRequests.find((r) => r.id === returnId);

  if (!returnRequest) {
    return {
      success: false,
      reason: `Return request with id ${returnId} does not exist`,
    };
  }

  const isValid =
    validReturnTransitions[returnRequest.status].includes(decision);

  if (!isValid) {
    return {
      success: false,
      reason: `Cannot move from ${returnRequest.status} to ${decision}`,
    };
  }

  returnRequest.status = decision;
  if (decision === "rejected") {
    const orderResult = updateOrderStatus(returnRequest.orderId, "delivered");
    if (!orderResult.success) return orderResult;
  }
  return { success: true };
};

export const markReturnInTransit = (
  returnId: number,
): { success: true } | { success: false; reason: string } => {
  const returnRequest = ReturnRequests.find((r) => r.id === returnId);

  if (!returnRequest) {
    return {
      success: false,
      reason: `Return request with id ${returnId} does not exist`,
    };
  }

  const isValid =
    validReturnTransitions[returnRequest.status].includes("in_transit");

  if (!isValid) {
    return {
      success: false,
      reason: `Cannot move from ${returnRequest.status} to in_transit`,
    };
  }

  returnRequest.status = "in_transit";
  return { success: true };
};

export const receiveReturn = (
  returnId: number,
): { success: true } | { success: false; reason: string } => {
  const returnRequest = ReturnRequests.find((r) => r.id === returnId);

  if (!returnRequest) {
    return {
      success: false,
      reason: `Return request with id ${returnId} does not exist`,
    };
  }

  const isValid =
    validReturnTransitions[returnRequest.status].includes("received");

  if (!isValid) {
    return {
      success: false,
      reason: `Cannot move from ${returnRequest.status} to received`,
    };
  }

  returnRequest.status = "received";
  return { success: true };
};

export const markReturnRefunded = (
  returnId: number,
): { success: true } | { success: false; reason: string } => {
  const returnRequest = ReturnRequests.find((r) => r.id === returnId);

  if (!returnRequest) {
    return {
      success: false,
      reason: `Return request with id ${returnId} does not exit`,
    };
  }

  const isValid =
    validReturnTransitions[returnRequest.status].includes("refunded");

  if (!isValid) {
    return {
      success: false,
      reason: `Cannot move from ${returnRequest.status} to refunded`,
    };
  }

  returnRequest.status = "refunded";
  return { success: true };
};
