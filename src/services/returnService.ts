import { Orders } from "../store/orderStore.js";
import { ReturnRequests, getNextReturnId } from "../store/returnStore.js";
import { createReturnRequest } from "../returnLogic.js";
import { updateOrderStatus } from "./orderService.js";

export const returnOrder = (
  orderId: number,
  productId: number,
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