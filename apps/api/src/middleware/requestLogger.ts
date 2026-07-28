import type { NextFunction, Request, Response } from "express";
import type { AuthedRequest } from "./auth";

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - start) / 1e6;
    const authed = req as AuthedRequest;
    const user = authed.userId ? ` user=${authed.userId}` : "";
    const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
    const path = req.originalUrl.split("?")[0];

    console.log(
      `[${new Date().toISOString()}] ${req.method} ${path}${query} ${res.statusCode} ${durationMs.toFixed(1)}ms${user}`
    );
  });

  next();
}
