import type { Request, Response } from "express";
import * as authService from "../services/auth.service";
import type { AuthedRequest } from "../middleware/auth";
import { env } from "../config/env";

export async function login(req: Request, res: Response) {
  const expectedRole = authService.expectedRoleForOrigin(req.headers.origin);
  const result = await authService.loginUser(
    req.body.email,
    req.body.password,
    expectedRole
  );
  res.json(result);
}

export async function signup(req: Request, res: Response) {
  if (!env.SIGNUP_ENABLED) {
    return res.status(403).json({ error: "Signup is disabled" });
  }
  const result = await authService.signupUser(req.body.email, req.body.password);
  res.status(201).json(result);
}

export async function me(req: AuthedRequest, res: Response) {
  const result = await authService.getMe(req.userId!);
  res.json(result);
}
