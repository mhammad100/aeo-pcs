import type { Response } from "express";
import type { AuthedRequest } from "../middleware/auth";
import * as adminService from "../services/admin.service";

export async function listUsers(_req: AuthedRequest, res: Response) {
  const users = await adminService.listUsers();
  res.json({ users });
}

export async function listBusinesses(_req: AuthedRequest, res: Response) {
  const businesses = await adminService.listBusinesses();
  res.json({ businesses });
}

export async function createBusinessUser(req: AuthedRequest, res: Response) {
  const result = await adminService.createBusinessUser({
    email: req.body.email,
    password: req.body.password,
    businessName: req.body.businessName,
    canGenerateActionPlanOnFreeRun: req.body.canGenerateActionPlanOnFreeRun,
  });
  res.status(201).json(result);
}

export async function setUserStatus(req: AuthedRequest, res: Response) {
  const result = await adminService.setUserStatus({
    actorUserId: req.userId!,
    targetUserId: req.params.userId,
    status: req.body.status,
  });
  res.json(result);
}
