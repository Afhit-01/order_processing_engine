import type { ReturnStatus, ReturnRequest } from "./types.js";

export const createReturnRequest = (
    id: number,
  orderId: number,
  productId: number,
  reason: string,
): ReturnRequest => {
  const returnedItem: ReturnRequest = {
    id: id,
    orderId: orderId,
    productId: productId,
    reason: reason,
    requestedAt: new Date().toISOString(), // ISO date string// ISO date string
    status: "pending",
  };

  return returnedItem;
};
