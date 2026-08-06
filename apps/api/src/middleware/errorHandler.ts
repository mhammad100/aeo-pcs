import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/AppError";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    return res.status(err.status).json({
      error: err.message,
      ...(err.code ? { code: err.code } : {}),
      ...(err.details ? { details: err.details } : {}),
    });
  }

  console.error(err);

  // Razorpay (and similar) often throw plain objects — never echo them to clients.
  if (err && typeof err === "object" && !(err instanceof Error) && "error" in err) {
    return res.status(502).json({ error: "Internal server error" });
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  const status =
    message.includes("ANTHROPIC_API_KEY") || message.includes("Missing required env") ? 503 : 500;
  return res.status(status).json({ error: message });
}
