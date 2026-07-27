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

export async function getJob(req: AuthedRequest, res: Response) {
  const job = await visibilityJobsService.getVisibilityJob({
    jobId: req.params.jobId,
    userId: req.userId!,
    userRole: req.userRole,
  });
  res.json(job);
}
