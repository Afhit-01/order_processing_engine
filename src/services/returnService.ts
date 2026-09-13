import { getOrderByIdFromDb, Orders } from "../store/orderStore.js";
import { ReturnRequests, getNextReturnId, getReturnByIdFromDB, insertReturnRequest, updateReturnRequestInDB } from "../store/returnStore.js";
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

export const returnOrder = async (
  orderId: string,
  productId: string,
  quantity: number,
  reason: string,
): Promise<{ success: true; message: string } | { success: false; reason: string }> => {
  const order = await getOrderByIdFromDb(orderId)
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

  await insertReturnRequest(orderId,
  productId,
  quantity,
  reason,)

  const statusResult = await updateOrderStatus(orderId, "return_requested");
  if (!statusResult.success) return {
    success: statusResult.success,
    reason: statusResult.reason
  }

  return {
    success: true,
    message: "Your return request has been received and is under review",
  };
};

export const reviewReturn = async (
  returnId: string,
  decision: "approved" | "rejected",
): Promise<{ success: true } | { success: false; reason: string }> => {
  const returnRequest = await getReturnByIdFromDB(returnId);

  if (!returnRequest) {
    return {
      success: false,
      reason: `Return request with id ${returnId} does not exist`,
    };
  }

  const isValid = validReturnTransitions[returnRequest.status].includes(decision);

  if (!isValid) {
    return {
      success: false,
      reason: `Cannot move from ${returnRequest.status} to ${decision}`,
    };
  }

  await updateReturnRequestInDB(returnId, decision)
  if (decision === "rejected") {
    const orderResult = await updateOrderStatus(returnRequest.orderId, "delivered");
    if (!orderResult.success) return orderResult;
  }
  return { success: true };
};

// to be sorted

export const markReturnInTransit = (
  returnId: string,
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
  returnId: string,
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
  returnId: string,
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
