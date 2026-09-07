import { Router, type Request, type Response } from "express";
import {
  createOrder,
  cancelOrder,
  getOrderReport,
  getOrdersByStatus,
  getOrderTotal,
  updateOrderStatus,
} from "../services/orderService.js";
import type { OrderStatus } from "../types.js";

const router = Router();

router.post("/", (req: Request, res: Response) => {
  const { customerName, items } = req.body;
  const result = createOrder(customerName, items);

  if (!result.success) return res.status(400).json({ error: result.reason });
  res.status(201).json(result.order);
});

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

router.get("/:id/total", (req: Request, res: Response) => {
  const total = getOrderTotal(Number(req.params.id));

  if (total === null) return res.status(404).json({ error: "Order not found" });
  res.status(200).json({ total });
});

router.patch("/:id/status", (req: Request, res: Response) => {
  const result = updateOrderStatus(Number(req.params.id), req.body.status);

  if (!result.success) return res.status(400).json({ error: result.reason });
  res.status(200).json({ message: "Status updated" });
});

router.delete("/:id", (req: Request, res: Response) => {
  const result = cancelOrder(Number(req.params.id));

  if (!result.success) return res.status(400).json({ error: result.reason });
  res.status(200).json({ message: "Order cancelled" });
});

export default router;