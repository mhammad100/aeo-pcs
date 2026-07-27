import type { NextFunction, Request, Response } from "express";

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(err);
  const message = err instanceof Error ? err.message : "Internal server error";
  const status = message.includes("ANTHROPIC_API_KEY") ? 503 : 500;
  res.status(status).json({ error: message });
}
