import type { ReturnStatus, ReturnRequest } from "./types.js";

export const createReturnRequest = (
  orderId: number,
  productId: number,
  reason: string,
): ReturnRequest => {
  const returnedItem: ReturnRequest = {
    orderId: orderId,
    productId: productId,
    reason: reason,
    requestedAt: new Date().toISOString(), // ISO date string// ISO date string
    status: "pending",
  };

  return returnedItem;
};
