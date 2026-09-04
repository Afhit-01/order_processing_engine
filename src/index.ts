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

app.get("/", (request: Request, response: Response) => {
  response
    .status(200)
    .send(
      "Wanna test the order management system? Use the endpoints to create, update, and manage orders.",
    );
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
