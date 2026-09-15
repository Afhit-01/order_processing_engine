import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import ordersRouter from "./routes/ordersRouter.js";
import returnsRouter from "./routes/returnsRouter.js";
import refundsRouter from "./routes/refundsRouter.js";
import dotenv from "dotenv";
import helmet from "helmet";

dotenv.config();

const app: Express = express();
const port = process.env.PORT;

app.use(helmet());
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.status(200).send("Wanna test the order management system? see /orders");
});

app.use("/orders", ordersRouter);
app.use("/return", returnsRouter);
app.use("/refunds", refundsRouter);

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.log(err);
  res.status(500).json({ error: "Something went wrong" });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
