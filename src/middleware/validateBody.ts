import type { Request, Response, NextFunction } from "express";

export const validateBody = <T>(guard: (body: unknown) => body is T) => {
  const middleware = (req: Request, res: Response, next: NextFunction) => {
    if (!guard(req.body)) {
      return res.status(400).json({ error: "Invalid request body" });
    }

    next();
  };
  return middleware;
};
