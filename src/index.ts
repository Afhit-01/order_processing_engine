import express, { type Express, type Request, type Response } from "express";
import ordersRouter from "./routes/ordersRouter.js";
import returnsRouter from "./routes/returnsRouter.js";

const app: Express = express();
const port = 3000;

app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.status(200).send("Wanna test the order management system? see /orders");
});

app.use("/orders", ordersRouter);
app.use("/return", returnsRouter);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});