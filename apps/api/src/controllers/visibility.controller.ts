import type { Response } from "express";
import type { AuthedRequest } from "../middleware/auth";
import * as visibilityJobsService from "../services/visibilityJobs.service";

export async function createJob(req: AuthedRequest, res: Response) {
  const result = await visibilityJobsService.createVisibilityJob({
    userId: req.userId!,
    category: req.body.category,
    prompts: req.body.prompts,
  });
  res.status(202).json(result);
}

export async function startJob(req: AuthedRequest, res: Response) {
  const result = await visibilityJobsService.startVisibilityJob({
    userId: req.userId!,
    category: req.body.category,
    prompts: Array.isArray(req.body.prompts) ? req.body.prompts : undefined,
  });
  res.status(201).json(result);
}

export async function runJob(req: AuthedRequest, res: Response) {
  const result = await visibilityJobsService.runVisibilityJob({
    userId: req.userId!,
    userRole: req.userRole,
    jobId: req.params.jobId,
    prompts: req.body.prompts,
  });
  res.status(202).json(result);
}

export async function listJobs(req: AuthedRequest, res: Response) {
  const limitRaw = Number(req.query.limit);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 100) : 20;
  const status =
    req.query.status === "completed" ||
    req.query.status === "failed" ||
    req.query.status === "running" ||
    req.query.status === "queued" ||
    req.query.status === "cancelled" ||
    req.query.status === "generating" ||
    req.query.status === "ready"
      ? req.query.status
      : undefined;

  const jobs = await visibilityJobsService.listVisibilityJobs({
    userId: req.userId!,
    limit,
    status,
  });
  res.json({ jobs });
}

export async function getActiveJob(req: AuthedRequest, res: Response) {
  const result = await visibilityJobsService.getActiveVisibilityJob(req.userId!);
  res.json(result);
}

export async function cancelJob(req: AuthedRequest, res: Response) {
  const result = await visibilityJobsService.cancelVisibilityJob({
    jobId: req.params.jobId,
    userId: req.userId!,
    userRole: req.userRole,
  });
  res.json(result);
}

export async function getInsights(req: AuthedRequest, res: Response) {
  const insights = await visibilityJobsService.getBusinessInsights(req.userId!);
  res.json({ insights });
}

export async function getJob(req: AuthedRequest, res: Response) {
  const job = await visibilityJobsService.getVisibilityJob({
    jobId: req.params.jobId,
    userId: req.userId!,
    userRole: req.userRole,
  });
  res.json(job);
}
