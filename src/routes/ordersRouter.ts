import { Router, type Request, type Response } from "express";
import {
  createOrder,
  cancelOrder,
  getOrderReport,
  getOrdersByStatus,
  getOrderTotal,
  updateOrderStatus,
  getOrderById,
} from "../services/orderService.js";
import type { OrderStatus } from "../types.js";
import {
  isCreateOrderPayload,
  isValidStatus,
  isValidParam,
} from "../validation/orderValidation.js";
import { validateBody } from "../middleware/validateBody.js";

const router = Router();

router.post(
  "/",
  validateBody(isCreateOrderPayload),
  (req: Request, res: Response) => {
    if (!isCreateOrderPayload(req.body)) {
      return res.status(400).json({
        error: "Invalid order payload",
      });
    }
    const { customerName, items } = req.body;
    const result = createOrder(customerName, items);

    if (!result.success) return res.status(400).json({ error: result.reason });
    res.status(201).json(result.order);
  },
);

router.get("/", (req: Request, res: Response) => {
  const status = req.query.status as OrderStatus | undefined;

  if (!status) {
    return res.status(400).json({ error: "Status query param is required" });
  }

  res.status(200).json(getOrdersByStatus(status));
});

router.get("/report", (req: Request, res: Response) => {
  res.status(200).json(getOrderReport());
});

router.get("/:orderId", (req: Request, res: Response) => {
  if (!isValidParam(req.params.orderId)) {
    return res.status(400).json({ error: "orderId must be provided" });
  }

  const orderId = req.params.orderId;
  const order = getOrderById(orderId);

  if (!order) {
    return res.status(404).json({ error: "Order not found" });
  }

  res.status(200).json(order);
});

router.get("/:orderId/total", (req: Request, res: Response) => {
  if (!isValidParam(req.params.orderId)) {
    return res.status(400).json({ error: "orderId must be provided" });
  }

  const total = getOrderTotal(req.params.orderId);

  if (total === null) return res.status(404).json({ error: "Order not found" });
  res.status(200).json({ total });
});

router.patch("/:orderId/status", (req: Request, res: Response) => {
  if (!isValidParam(req.params.orderId)) {
    return res.status(400).json({ error: "orderId must be provided" });
  }

  const newStatus = req.body.status;

  if (!isValidStatus(newStatus)) {
    return res.status(400).json({
      error: "Status is invalid",
    });
  }

  const result = updateOrderStatus(req.params.orderId, newStatus);

  if (!result.success) return res.status(400).json({ error: result.reason });
  res.status(200).json({ message: "Status updated" });
});

router.delete("/:orderId", (req: Request, res: Response) => {
  if (!isValidParam(req.params.orderId)) {
    return res.status(400).json({ error: "orderId must be provided" });
  }

  const result = cancelOrder(req.params.orderId);

  if (!result.success) return res.status(400).json({ error: result.reason });
  res.status(200).json({ message: "Order cancelled" });
});

export default router;
