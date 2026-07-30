import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { UserRole } from "@aeo-pcs/shared";
import { env } from "../config/env";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

export type JwtPayload = {
  sub: string;
  role: UserRole;
};

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, env.jwtSecret);
  if (typeof decoded !== "object" || !decoded || !("sub" in decoded) || !("role" in decoded)) {
    throw new Error("Invalid token payload");
  }
  return {
    sub: String((decoded as JwtPayload).sub),
    role: (decoded as JwtPayload).role,
  };
}

export function extractBearerToken(req: {
  headers: { authorization?: string };
  query: Record<string, unknown>;
}): string | null {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }
  const queryToken = req.query.token;
  if (typeof queryToken === "string" && queryToken.trim()) {
    return queryToken.trim();
  }
  return null;
}
