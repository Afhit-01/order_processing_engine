import express, { type Express, type Request, type Response } from "express";

import {
  createOrder,
  cancelOrder,
  getOrderReport,
  getOrdersByStatus,
  getOrderTotal,
  updateOrderStatus,
} from "./orderLogic.js";
import type { OrderStatus } from "./types.js";

const app: Express = express();
const port = 3000;

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.status(200).send("Wanna test the order management system? see /orders");
});

// Create

app.post("/orders", (req: Request, res: Response) => {
  const { customerName, items } = req.body;
  const result = createOrder(customerName, items);

  if (!result.success) {
    return res.status(400).json({ error: result.reason });
  }

  res.status(201).json(result.order);
});

// Read

app.get("/orders", (req: Request, res: Response) => {
  const status = req.query.status as OrderStatus | undefined;

  if (!status) {
    return res.status(400).json({
      error: "Status query param is required",
    });
  }

  res.status(200).json(getOrdersByStatus(status));
});

// Read

app.get("/orders/:id/total", (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const total = getOrderTotal(id);

  if (total === null) {
    return res.status(404).json({ error: "Order not found" });
  }

  res.status(200).json({ total });
});

app.get("/orders/report", (req: Request, res: Response) => {
  res.status(200).json(getOrderReport());
});

// Update

app.patch("/orders/:id/status", (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const status = req.body.status;

  const result = updateOrderStatus(id, status);

  if (!result.success) {
    return res.status(400).json({
      error: result.reason,
    });
  }

  res.status(200).json({
    message: "Status updated",
  });
});

// Delete

app.delete("/orders/:id", (req: Request, res: Response) => {
  const result = cancelOrder(Number(req.params.id));

  if (!result.success) {
    return res.status(400).json({
      error: result.reason,
    });
  }

  res.status(200).json({
    message: "Order cancelled",
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
