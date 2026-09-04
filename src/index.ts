import express, { type Express, type Request, type Response } from "express";

import {
  createOrder,
  cancelOrder,
  getOrderReport,
  getOrdersByStatus,
  getOrderTotal,
  updateOrderStatus,
} from "./orderLogic.js";

const app: Express = express();
const port = 3000;

app.use(express.json());

app.post("/orders", (req: Request, res: Response) => {

  const detail = req.body;
  const order = createOrder(detail.customerName, detail.items);
  res.status(201).json(order);
});

app.get("/", (req: Request, res: Response) => {
  res
    .status(200)
    .send(
      "Wanna test the order management system? Use the endpoints to create, update, and manage orders.",
    );
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
