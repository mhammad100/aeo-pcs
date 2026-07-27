import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "@aeo-pcs/shared";
import { UserModel } from "../models/User";
import { verifyAccessToken } from "../utils/auth";

export type AuthedRequest = Request & {
  userId?: string;
  userRole?: UserRole;
};

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }
    const token = header.slice("Bearer ".length).trim();
    const payload = verifyAccessToken(token);
    const user = await UserModel.findById(payload.sub);
    if (!user || user.status !== "active") {
      return res.status(401).json({ error: "Invalid or disabled account" });
    }
    req.userId = String(user._id);
    req.userRole = user.role as UserRole;
    return next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

export function requireRole(...roles: UserRole[]) {
  return (req: AuthedRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return next();
  };
}
