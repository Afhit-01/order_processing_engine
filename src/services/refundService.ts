import { getReturnByIdFromDB } from "../store/returnStore.js";
import {
  getRefundByIdFromDB,
  insertRefund,
  updateRefundStatusInDb,
} from "../store/refundStore.js";
import type { Refund } from "../types.js";
import { updateOrderStatus } from "./orderService.js";
import { markReturnRefunded } from "./returnService.js";

export const processRefund = async (
  returnId: string,
  amount: number,
): Promise<
  { success: true; refund: Refund } | { success: false; reason: string }
> => {
  const returnRequest = await getReturnByIdFromDB(returnId);

  if (!returnRequest) {
    return {
      success: false,
      reason: `Return request with id ${returnId} does not exist`, // fixed typo here
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

  const refund = await insertRefund(
    returnRequest.id,
    returnRequest.orderId,
    returnRequest.productId,
    amount,
  );

  return { success: true, refund };
};

export const completeRefund = async (
  refundId: string,
  outcome: "completed" | "failed",
): Promise<{ success: true } | { success: false; reason: string }> => {
  const refund = await getRefundByIdFromDB(refundId);

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
    await updateRefundStatusInDb(refundId, "failed");
    return { success: true };
  }

  const returnResult = await markReturnRefunded(refund.returnRequestId);

  if (!returnResult.success) {
    return returnResult;
  }

  const orderResult = await updateOrderStatus(refund.orderId, "returned");

  if (!orderResult.success) {
    return orderResult;
  }

  const completedTime = new Date().toISOString();
  await updateRefundStatusInDb(refundId, "completed", completedTime);

  return { success: true };
};
