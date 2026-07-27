import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }

  console.error(err);
  const message = err instanceof Error ? err.message : "Internal server error";
  const status = message.includes("ANTHROPIC_API_KEY") || message.includes("Missing required env") ? 503 : 500;
  return res.status(status).json({ error: message });
}
