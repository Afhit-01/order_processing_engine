import { Router, type Request, type Response } from "express";
import {
  markReturnInTransit,
  receiveReturn,
  returnOrder,
  reviewReturn,
} from "../services/returnService.js";
import { isNumericString } from "../validation/orderValidation.js";
import { ReturnRequests } from "../store/returnStore.js";
import { processRefund } from "../services/refundService.js";

const router = Router();

router.patch(
  "/:orderId/:productId/:quantity",
  (req: Request, res: Response) => {
    if (!isNumericString(req.params.orderId)) {
      return res.status(400).json({ error: "orderId must be numeric" });
    }
    if (!isNumericString(req.params.productId)) {
      return res.status(400).json({ error: "productId must be numeric" });
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

    const result = returnOrder(
      Number(req.params.orderId),
      Number(req.params.productId),
      Number(req.params.quantity),
      reason,
    );

    if (!result.success) return res.status(400).json({ error: result.reason });
    res.status(200).json({ message: result.message });
  },
);

router.patch("/:orderId/:productId/review", (req: Request, res: Response) => {
  const orderId = req.params.orderId;
  const productId = req.params.productId;

  if (!isNumericString(orderId)) {
    return res.status(400).json({ error: "orderId must be numeric" });
  }

  if (!isNumericString(productId)) {
    return res.status(400).json({ error: "productId must be numeric" });
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

  const item = ReturnRequests.find(
    (r) => r.orderId === Number(orderId) && r.productId === Number(productId),
  );

  if (!item) {
    return res.status(404).json({
      error:
        "Request with the provided IDs cannot be found. Kindly check if there was a mismatch.",
    });
  }

  const result = reviewReturn(item.id, review);

  if (!result.success) {
    return res.status(400).json({ error: result.reason });
  }

  return res.status(200).json({
    message: `Return request ${review} successfully`,
    returnRequest: item,
  });
});

router.patch("/:orderId/:productId/ship", (req: Request, res: Response) => {
  const orderId = req.params.orderId;
  const productId = req.params.productId;

  if (!isNumericString(orderId)) {
    return res.status(400).json({ error: "orderId must be numeric" });
  }

  if (!isNumericString(productId)) {
    return res.status(400).json({ error: "productId must be numeric" });
  }

  const item = ReturnRequests.find(
    (r) => r.orderId === Number(orderId) && r.productId === Number(productId),
  );

  if (!item) {
    return res.status(404).json({
      error:
        "Request with the provided IDs cannot be found. Kindly check if there was a mismatch.",
    });
  }

  const result = markReturnInTransit(item.id);

  if (!result.success) {
    return res.status(400).json({ error: result.reason });
  }

  return res.status(200).json({
    message: "Return marked as in transit successfully",
    returnRequest: item,
  });
});

router.patch("/:orderId/:productId/receive", (req: Request, res: Response) => {
  const orderId = req.params.orderId;
  const productId = req.params.productId;

  if (!isNumericString(orderId)) {
    return res.status(400).json({ error: "orderId must be numeric" });
  }

  if (!isNumericString(productId)) {
    return res.status(400).json({ error: "productId must be numeric" });
  }

  const item = ReturnRequests.find(
    (r) => r.orderId === Number(orderId) && r.productId === Number(productId),
  );

  if (!item) {
    return res.status(404).json({
      error:
        "Request with the provided IDs cannot be found. Kindly check if there was a mismatch.",
    });
  }

  const result = receiveReturn(item.id);

  if (!result.success) {
    return res.status(400).json({ error: result.reason });
  }

  return res.status(200).json({
    message: "Return received successfully",
    returnRequest: item,
  });
});

router.post("/:orderId/:productId/refund", (req: Request, res: Response) => {
  const orderId = req.params.orderId;
  const productId = req.params.productId;

  if (!isNumericString(orderId)) {
    return res.status(400).json({ error: "orderId must be numeric" });
  }

  if (!isNumericString(productId)) {
    return res.status(400).json({ error: "productId must be numeric" });
  }

  const { refundAmount } = req.body;

  if (typeof refundAmount !== "number") {
    return res.status(400).json({
      error: "refundAmount must be a number",
    });
  }

  const item = ReturnRequests.find(
    (r) => r.orderId === Number(orderId) && r.productId === Number(productId),
  );

  if (!item) {
    return res.status(404).json({
      error:
        "Request with the provided IDs cannot be found. Kindly check if there was a mismatch.",
    });
  }

  const result = processRefund(item.id, refundAmount);

  if (!result.success) {
    return res.status(400).json({ error: result.reason });
  }

  return res.status(200).json({
    message: "Refund request created successfully",
    refund: result.refund,
  });
});

export default router;
