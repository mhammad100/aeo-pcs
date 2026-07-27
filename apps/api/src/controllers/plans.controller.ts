import type { Response } from "express";
import type { AuthedRequest } from "../middleware/auth";
import * as visibilityJobsService from "../services/visibilityJobs.service";

export async function buildPlan(req: AuthedRequest, res: Response) {
  const result = await visibilityJobsService.buildPlanForJob({
    jobId: req.body.jobId,
    userId: req.userId!,
    userRole: req.userRole,
  });
  res.json(result);
}

export async function generateItem(req: AuthedRequest, res: Response) {
  const result = await visibilityJobsService.generatePlanItem({
    jobId: req.body.jobId,
    userId: req.userId!,
    userRole: req.userRole,
    itemId: req.body.itemId,
    title: req.body.title,
    description: req.body.description,
  });
  res.json(result);
}
