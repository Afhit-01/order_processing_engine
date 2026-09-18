import { Router, type Request, type Response } from "express";

import {
  markReturnInTransit,
  receiveReturn,
  returnOrder,
  reviewReturn,
} from "../services/returnService.js";

import { isValidParam, isNumericString } from "../validation/validation.js";

import { getReturnByOrderAndProductFromDb } from "../store/returnStore.js";

import { processRefund } from "../services/refundService.js";

import { requireAuth } from "../middleware/requireAuth.js";
import { checkIdempotency } from "../middleware/idempotency.js";

const router = Router();

router.use(requireAuth);

router.patch(
  "/:orderId/:productId/:quantity",
  async (req: Request, res: Response) => {
    try {
      const { orderId, productId, quantity } = req.params;

      if (!isValidParam(orderId)) {
        return res.status(400).json({
          error: "orderId must be provided",
        });
      }

      if (!isValidParam(productId)) {
        return res.status(400).json({
          error: "productId must be provided",
        });
      }

      if (!isNumericString(quantity)) {
        return res.status(400).json({
          error: "quantity must be numeric",
        });
      }

      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          error: "Kindly provide a reason for return",
        });
      }

      if (Array.isArray(reason)) {
        return res.status(400).json({
          error: "reason must be a string",
        });
      }

      const result = await returnOrder(
        req.user!,
        orderId,
        productId,
        Number(quantity),
        reason,
      );

      if (!result.success) {
        return res.status(400).json({
          error: result.reason,
        });
      }

      return res.status(200).json({
        message: result.message,
      });
    } catch {
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  },
);

router.patch(
  "/:orderId/:productId/review",
  async (req: Request, res: Response) => {
    try {
      const { orderId, productId } = req.params;

      if (!isValidParam(orderId)) {
        return res.status(400).json({
          error: "orderId must be provided",
        });
      }

      if (!isValidParam(productId)) {
        return res.status(400).json({
          error: "productId must be provided",
        });
      }

      const { review } = req.body;

      if (!review) {
        return res.status(400).json({
          error: "Kindly provide a review decision",
        });
      }

      if (Array.isArray(review)) {
        return res.status(400).json({
          error: "review must be a string",
        });
      }

      if (review !== "approved" && review !== "rejected") {
        return res.status(400).json({
          error: "review must be either 'approved' or 'rejected'",
        });
      }

      const customerIdFilter =
        req.user!.role === "customer" ? req.user!.id : undefined;

      const item = await getReturnByOrderAndProductFromDb(
        orderId,
        productId,
        customerIdFilter,
      );

      if (!item) {
        return res.status(404).json({
          error:
            "Request with the provided IDs cannot be found. Kindly check if there was a mismatch.",
        });
      }

      const result = await reviewReturn(item.id, review, req.user!);

      if (!result.success) {
        return res.status(403).json({
          error: result.reason,
        });
      }

      const updatedItem = await getReturnByOrderAndProductFromDb(
        orderId,
        productId,
        customerIdFilter,
      );

      return res.status(200).json({
        message: `Return request ${review} successfully`,
        returnRequest: updatedItem,
      });
    } catch {
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  },
);

router.patch(
  "/:orderId/:productId/ship",
  async (req: Request, res: Response) => {
    try {
      const { orderId, productId } = req.params;

      if (!isValidParam(orderId)) {
        return res.status(400).json({
          error: "orderId must be provided",
        });
      }

      if (!isValidParam(productId)) {
        return res.status(400).json({
          error: "productId must be provided",
        });
      }

      const customerIdFilter =
        req.user!.role === "customer" ? req.user!.id : undefined;

      const item = await getReturnByOrderAndProductFromDb(
        orderId,
        productId,
        customerIdFilter,
      );

      if (!item) {
        return res.status(404).json({
          error:
            "Request with the provided IDs cannot be found. Kindly check if there was a mismatch.",
        });
      }

      const result = await markReturnInTransit(item.id, req.user!);

      if (!result.success) {
        return res.status(403).json({
          error: result.reason,
        });
      }

      const updatedItem = await getReturnByOrderAndProductFromDb(
        orderId,
        productId,
        customerIdFilter,
      );

      return res.status(200).json({
        message: "Return marked as in transit successfully",
        returnRequest: updatedItem,
      });
    } catch {
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  },
);

router.patch(
  "/:orderId/:productId/receive",
  async (req: Request, res: Response) => {
    try {
      const { orderId, productId } = req.params;

      if (!isValidParam(orderId)) {
        return res.status(400).json({
          error: "orderId must be provided",
        });
      }

      if (!isValidParam(productId)) {
        return res.status(400).json({
          error: "productId must be provided",
        });
      }

      const customerIdFilter =
        req.user!.role === "customer" ? req.user!.id : undefined;

      const item = await getReturnByOrderAndProductFromDb(
        orderId,
        productId,
        customerIdFilter,
      );

      if (!item) {
        return res.status(404).json({
          error:
            "Request with the provided IDs cannot be found. Kindly check if there was a mismatch.",
        });
      }

      const result = await receiveReturn(item.id, req.user!);

      if (!result.success) {
        return res.status(403).json({
          error: result.reason,
        });
      }

      const updatedItem = await getReturnByOrderAndProductFromDb(
        orderId,
        productId,
        customerIdFilter,
      );

      return res.status(200).json({
        message: "Return received successfully",
        returnRequest: updatedItem,
      });
    } catch {
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  },
);

router.post(
  "/:orderId/:productId/refund",
  checkIdempotency,
  async (req: Request, res: Response) => {
    try {
      const { orderId, productId } = req.params;

      if (!isValidParam(orderId)) {
        return res.status(400).json({
          error: "orderId must be provided",
        });
      }

      if (!isValidParam(productId)) {
        return res.status(400).json({
          error: "productId must be provided",
        });
      }

      const { refundAmount } = req.body;

      if (typeof refundAmount !== "number") {
        return res.status(400).json({
          error: "refundAmount must be a number",
        });
      }

      const customerIdFilter =
        req.user!.role === "customer" ? req.user!.id : undefined;

      const item = await getReturnByOrderAndProductFromDb(
        orderId,
        productId,
        customerIdFilter,
      );

      if (!item) {
        return res.status(404).json({
          error:
            "Request with the provided IDs cannot be found. Kindly check if there was a mismatch.",
        });
      }

      const result = await processRefund(item.id, refundAmount, req.user!);

      if (!result.success) {
        return res.status(403).json({
          error: result.reason,
        });
      }

      return res.status(200).json({
        message: "Refund request created successfully",
        refund: result.refund,
      });
    } catch {
      return res.status(500).json({
        error: "Internal server error",
      });
    }
  },
);

export default router;
