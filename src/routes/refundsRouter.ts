import { Router, type Request, type Response } from "express";
import { completeRefund } from "../services/refundService.js";
import { getRefundByIdFromDB } from "../store/refundStore.js";
import { isValidParam } from "../validation/validation.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();
router.use(requireAuth);

router.patch("/:refundId/complete", async (req: Request, res: Response) => {
  try {
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

    const result = await completeRefund(refundId, outcome);

    if (!result.success) {
      return res.status(400).json({
        error: result.reason,
      });
    }

    const refund = await getRefundByIdFromDB(refundId);

    return res.status(200).json({
      message:
        outcome === "completed"
          ? "Refund completed successfully"
          : "Refund marked as failed",
      refund,
    });
  } catch (error) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
