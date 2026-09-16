import { getOrderById, updateOrderStatus } from "./orderService.js";

import {
  getReturnByIdFromDB,
  insertReturnRequest,
  updateReturnRequestInDB,
} from "../store/returnStore.js";

import {
  getOrderByIdFromDb,
  updateOrderStatusInDb,
} from "../store/orderStore.js";

import type { ReturnStatus, JwtPayload } from "../types.js";

export const validReturnTransitions: Record<ReturnStatus, ReturnStatus[]> = {
  pending: ["approved", "rejected"],
  approved: ["in_transit"],
  rejected: [],
  in_transit: ["received"],
  received: ["refunded"],
  refunded: [],
};

// Ownership has already been verified by returnOrder() before this function is called
export const requestReturnOrder = async (
  orderId: string,
): Promise<{ success: true } | { success: false; reason: string }> => {
  const order = await getOrderByIdFromDb(orderId);

  if (!order) {
    return {
      success: false,
      reason: "Order not found",
    };
  }

  if (order.status !== "delivered") {
    return {
      success: false,
      reason: `Cannot change order status from ${order.status} to return_requested`,
    };
  }

  await updateOrderStatusInDb(orderId, "return_requested");

  return {
    success: true,
  };
};

export const returnOrder = async (
  user: JwtPayload,
  orderId: string,
  productId: string,
  quantity: number,
  reason: string,
): Promise<
  { success: true; message: string } | { success: false; reason: string }
> => {
  // Only customers can request returns.
  if (user.role !== "customer") {
    return {
      success: false,
      reason: "Only customers can request returns",
    };
  }

  // getOrderById() applies the customer's ownership filter.
  const order = await getOrderById(orderId, user);

  if (!order) {
    return {
      success: false,
      reason: `Order with id ${orderId} was not found`,
    };
  }

  if (order.status !== "delivered") {
    return {
      success: false,
      reason:
        "Can't return this item yet. You can request a return after it has been delivered.",
    };
  }

  if (quantity <= 0) {
    return {
      success: false,
      reason: "Quantity must be greater than 0",
    };
  }

  const item = order.items.find((item) => item.productId === productId);

  if (!item) {
    return {
      success: false,
      reason: `Item with id ${productId} does not exist in order ${orderId}`,
    };
  }

  if (quantity > item.quantity) {
    return {
      success: false,
      reason: "Return quantity cannot exceed the quantity ordered",
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

  await insertReturnRequest(orderId, productId, quantity, reason);

  // Ownership was already established by getOrderById(orderId, user).
  const statusResult = await requestReturnOrder(orderId);

  if (!statusResult.success) {
    return statusResult;
  }

  return {
    success: true,
    message: "Your return request has been received and is under review",
  };
};

export const reviewReturn = async (
  returnId: string,
  decision: "approved" | "rejected",
  user: JwtPayload,
): Promise<{ success: true } | { success: false; reason: string }> => {
  // Reviewing returns is a staff/admin operation.
  if (user.role !== "staff" && user.role !== "admin") {
    return {
      success: false,
      reason: "Only staff or admin can review return requests",
    };
  }

  // Staff/admin can access return requests across customers.
  const returnRequest = await getReturnByIdFromDB(returnId);

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

  await updateReturnRequestInDB(returnId, decision);

  if (decision === "rejected") {
    const orderResult = await updateOrderStatus(
      returnRequest.orderId,
      "delivered",
      user,
    );

    if (!orderResult.success) {
      return orderResult;
    }
  }

  return {
    success: true,
  };
};

export const markReturnInTransit = async (
  returnId: string,
  user: JwtPayload,
): Promise<{ success: true } | { success: false; reason: string }> => {
  // Only staff/admin can move returns into transit.
  if (user.role !== "staff" && user.role !== "admin") {
    return {
      success: false,
      reason: "Only staff or admin can mark returns as in transit",
    };
  }

  const returnRequest = await getReturnByIdFromDB(returnId);

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

  await updateReturnRequestInDB(returnId, "in_transit");

  return {
    success: true,
  };
};

export const receiveReturn = async (
  returnId: string,
  user: JwtPayload,
): Promise<{ success: true } | { success: false; reason: string }> => {
  // Only staff/admin can receive returns.
  if (user.role !== "staff" && user.role !== "admin") {
    return {
      success: false,
      reason: "Only staff or admin can receive returns",
    };
  }

  const returnRequest = await getReturnByIdFromDB(returnId);

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

  await updateReturnRequestInDB(returnId, "received");

  return {
    success: true,
  };
};

export const markReturnRefunded = async (
  returnId: string,
  user: JwtPayload,
): Promise<{ success: true } | { success: false; reason: string }> => {
  // Only staff/admin can mark returns as refunded.
  if (user.role !== "staff" && user.role !== "admin") {
    return {
      success: false,
      reason: "Only staff or admin can mark returns as refunded",
    };
  }

  const returnRequest = await getReturnByIdFromDB(returnId);

  if (!returnRequest) {
    return {
      success: false,
      reason: `Return request with id ${returnId} does not exist`,
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

  await updateReturnRequestInDB(returnId, "refunded");

  return {
    success: true,
  };
};
