import type { Response } from "express";
import type { AuthedRequest } from "../middleware/auth";
import * as visibilityJobsService from "../services/visibilityJobs.service";
import { subscribeToJob, writeSse } from "../services/jobEvents";

function toStreamPayload(job: Awaited<ReturnType<typeof visibilityJobsService.getVisibilityJob>>) {
  return {
    status: job.status,
    progress: job.progress ?? null,
    results: job.results ?? null,
    score: job.score ?? null,
    error: job.error ?? null,
  };
}

export async function streamJob(req: AuthedRequest, res: Response) {
  const jobId = req.params.jobId;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const job = await visibilityJobsService.getVisibilityJob({
    jobId,
    userId: req.userId!,
    userRole: req.userRole,
  });

  writeSse(res, "snapshot", toStreamPayload(job));

  if (job.status === "completed" || job.status === "failed") {
    res.end();
    return;
  }

  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 15000);

  const unsubscribe = subscribeToJob(jobId, (payload) => {
    writeSse(res, "update", payload);
    if (payload.status === "completed" || payload.status === "failed") {
      clearInterval(heartbeat);
      unsubscribe();
      res.end();
    }
  });

  req.on("close", () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
}
