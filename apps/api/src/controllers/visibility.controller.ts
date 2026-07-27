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

export async function listJobs(req: AuthedRequest, res: Response) {
  const jobs = await visibilityJobsService.listVisibilityJobs({
    userId: req.userId!,
  });
  res.json({ jobs });
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
