import { Router, type Request, type Response } from "express";
import { returnOrder } from "../services/returnService.js";
import { isNumericString } from "../validation/orderValidation.js";

const router = Router();

router.patch("/:orderId/:productId/:quantity", (req: Request, res: Response) => {
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
    return res.status(400).json({ error: "Kindly provide a reason for return" });
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
});

export default router;