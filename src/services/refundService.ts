import { getReturnByIdFromDB } from "../store/returnStore.js";

import {
  getRefundByIdFromDB,
  insertRefund,
  updateRefundStatusInDb,
  completeRefundTransaction,
} from "../store/refundStore.js";

import type { Refund, JwtPayload } from "../types.js";

export const processRefund = async (
  returnId: string,
  amount: number,
  user: JwtPayload,
): Promise<
  { success: true; refund: Refund } | { success: false; reason: string }
> => {
  if (user.role !== "staff" && user.role !== "admin") {
    return {
      success: false,
      reason: "Only staff or admin can process refunds",
    };
  }

  const returnRequest = await getReturnByIdFromDB(returnId);

  if (!returnRequest) {
    return {
      success: false,
      reason: `Return request with id ${returnId} does not exist`,
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
      reason: "Refund amount must be greater than 0",
    };
  }

  const refund = await insertRefund(
    returnRequest.id,
    returnRequest.orderId,
    returnRequest.productId,
    amount,
  );

  return {
    success: true,
    refund,
  };
};

export const completeRefund = async (
  refundId: string,
  outcome: "completed" | "failed",
  user: JwtPayload,
): Promise<{ success: true } | { success: false; reason: string }> => {
  if (user.role !== "staff" && user.role !== "admin") {
    return {
      success: false,
      reason: "Only staff or admin can complete refunds",
    };
  }

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

    return {
      success: true,
    };
  }

  try {
    const completedTime = new Date().toISOString();

    await completeRefundTransaction(
      refundId,
      refund.returnRequestId,
      refund.orderId,
      completedTime,
    );

    return {
      success: true,
    };
  } catch (error) {
    if (error instanceof Error) {
      return {
        success: false,
        reason: error.message,
      };
    }

    return {
      success: false,
      reason: "Failed to complete refund",
    };
  }
};