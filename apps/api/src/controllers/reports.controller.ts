import type { Response } from "express";
import type { AuthedRequest } from "../middleware/auth";
import * as visibilityJobsService from "../services/visibilityJobs.service";

export async function getReport(req: AuthedRequest, res: Response) {
  const result = await visibilityJobsService.getReportForJob({
    jobId: req.params.jobId,
    userId: req.userId!,
    userRole: req.userRole,
  });
  res.json(result);
}
