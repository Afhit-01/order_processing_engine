import { Router, type Request, type Response } from "express";
import {
  markReturnInTransit,
  receiveReturn,
  returnOrder,
  reviewReturn,
} from "../services/returnService.js";
import {
  isValidParam,
  isNumericString,
} from "../validation/orderValidation.js";
import { getReturnByOrderAndProductFromDb } from "../store/returnStore.js";
import { processRefund } from "../services/refundService.js";

const router = Router();

router.patch(
  "/:orderId/:productId/:quantity",
  async (req: Request, res: Response) => {
    try {
      if (!isValidParam(req.params.orderId)) {
        return res.status(400).json({ error: "orderId must be provided" });
      }
      if (!isValidParam(req.params.productId)) {
        return res.status(400).json({ error: "productId must be provided" });
      }
      if (!isNumericString(req.params.quantity)) {
        return res.status(400).json({ error: "quantity must be numeric" });
      }

      const { reason } = req.body;

      if (!reason) {
        return res
          .status(400)
          .json({ error: "Kindly provide a reason for return" });
      }
      if (Array.isArray(reason)) {
        return res.status(400).json({ error: "reason must be a string" });
      }

      const result = await returnOrder(
        req.params.orderId,
        req.params.productId,
        Number(req.params.quantity),
        reason,
      );

      if (!result.success) return res.status(400).json({ error: result.reason });
      return res.status(200).json({ message: result.message });
    } catch (error) {
      return res.status(500).json({ error: "Internal server error" });
    }
  },
);

router.patch("/:orderId/:productId/review", async (req: Request, res: Response) => {
  try {
    const { orderId, productId } = req.params;

    if (!isValidParam(orderId)) {
      return res.status(400).json({ error: "orderId must be provided" });
    }
    if (!isValidParam(productId)) {
      return res.status(400).json({ error: "productId must be provided" });
    }

    const { review } = req.body;

    if (!review) {
      return res.status(400).json({ error: "Kindly provide a review decision" });
    }
    if (Array.isArray(review)) {
      return res.status(400).json({ error: "review must be a string" });
    }
    if (review !== "approved" && review !== "rejected") {
      return res.status(400).json({
        error: "review must be either 'approved' or 'rejected'",
      });
    }

    const item = await getReturnByOrderAndProductFromDb(orderId, productId);

    if (!item) {
      return res.status(404).json({
        error: "Request with the provided IDs cannot be found. Kindly check if there was a mismatch.",
      });
    }

    const result = await reviewReturn(item.id, review);

    if (!result.success) {
      return res.status(400).json({ error: result.reason });
    }

    // Refresh the item to return the updated status
    const updatedItem = await getReturnByOrderAndProductFromDb(orderId, productId);

    return res.status(200).json({
      message: `Return request ${review} successfully`,
      returnRequest: updatedItem,
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:orderId/:productId/ship", async (req: Request, res: Response) => {
  try {
    const { orderId, productId } = req.params;

    if (!isValidParam(orderId)) {
      return res.status(400).json({ error: "orderId must be provided" });
    }
    if (!isValidParam(productId)) {
      return res.status(400).json({ error: "productId must be provided" });
    }

    const item = await getReturnByOrderAndProductFromDb(orderId, productId);

    if (!item) {
      return res.status(404).json({
        error: "Request with the provided IDs cannot be found. Kindly check if there was a mismatch.",
      });
    }

    const result = await markReturnInTransit(item.id);

    if (!result.success) {
      return res.status(400).json({ error: result.reason });
    }

    const updatedItem = await getReturnByOrderAndProductFromDb(orderId, productId);

    return res.status(200).json({
      message: "Return marked as in transit successfully",
      returnRequest: updatedItem,
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/:orderId/:productId/receive", async (req: Request, res: Response) => {
  try {
    const { orderId, productId } = req.params;

    if (!isValidParam(orderId)) {
      return res.status(400).json({ error: "orderId must be provided" });
    }
    if (!isValidParam(productId)) {
      return res.status(400).json({ error: "productId must be provided" });
    }

    const item = await getReturnByOrderAndProductFromDb(orderId, productId);

    if (!item) {
      return res.status(404).json({
        error: "Request with the provided IDs cannot be found. Kindly check if there was a mismatch.",
      });
    }

    const result = await receiveReturn(item.id);

    if (!result.success) {
      return res.status(400).json({ error: result.reason });
    }

    const updatedItem = await getReturnByOrderAndProductFromDb(orderId, productId);

    return res.status(200).json({
      message: "Return received successfully",
      returnRequest: updatedItem,
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/:orderId/:productId/refund", async (req: Request, res: Response) => {
  try {
    const { orderId, productId } = req.params;

    if (!isValidParam(orderId)) {
      return res.status(400).json({ error: "orderId must be provided" });
    }
    if (!isValidParam(productId)) {
      return res.status(400).json({ error: "productId must be provided" });
    }

    const { refundAmount } = req.body;

    if (typeof refundAmount !== "number") {
      return res.status(400).json({
        error: "refundAmount must be a number",
      });
    }

    const item = await getReturnByOrderAndProductFromDb(orderId, productId);

    if (!item) {
      return res.status(404).json({
        error: "Request with the provided IDs cannot be found. Kindly check if there was a mismatch.",
      });
    }

    const result = await processRefund(item.id, refundAmount);

    if (!result.success) {
      return res.status(400).json({ error: result.reason });
    }

    return res.status(200).json({
      message: "Refund request created successfully",
      refund: result.refund, 
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;