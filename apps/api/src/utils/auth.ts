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
