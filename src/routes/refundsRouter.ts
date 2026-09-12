import { Router, type Request, type Response } from "express";
import { completeRefund } from "../services/refundService.js";
import { Refunds } from "../store/refundStore.js";
import { isValidParam } from "../validation/orderValidation.js";

const router = Router();

router.patch("/:refundId/complete", (req: Request, res: Response) => {
  const { refundId } = req.params;
  const { outcome } = req.body;

  if (!isValidParam(refundId)) {
    return res.status(400).json({
      error: "refundId must be provided",
    });
  }

  if (typeof outcome !== "string") {
    return res.status(400).json({
      error: "outcome must be a string",
    });
  }

  if (outcome !== "completed" && outcome !== "failed") {
    return res.status(400).json({
      error: "outcome must be either 'completed' or 'failed'",
    });
  }

  const result = completeRefund(refundId, outcome);

  if (!result.success) {
    return res.status(400).json({
      error: result.reason,
    });
  }

  const refund = Refunds.find((r) => r.id === refundId);

  return res.status(200).json({
    message:
      outcome === "completed"
        ? "Refund completed successfully"
        : "Refund marked as failed",
    refund,
  });
});

export default router;
