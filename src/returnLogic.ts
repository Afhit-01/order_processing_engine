import type { ReturnStatus, ReturnRequest } from "./types.js";

export const createReturnRequest = (
  id: string,
  orderId: string,
  productId: string,
  quantity: number,
  reason: string,
): ReturnRequest => {
  const returnedItem: ReturnRequest = {
    id: id,
    orderId: orderId,
    productId: productId,
    quantity: quantity,
    reason: reason,
    requestedAt: new Date().toISOString(), // ISO date string// ISO date string
    status: "pending",
  };

  return returnedItem;
};
