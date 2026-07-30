import type { Response } from "express";
import type { AuthedRequest } from "../middleware/auth";
import * as visibilityJobsService from "../services/visibilityJobs.service";

export async function getReport(req: AuthedRequest, res: Response) {
  const format = req.query.format === "html" ? "html" : "pdf";
  const result = await visibilityJobsService.getReportForJob({
    jobId: req.params.jobId,
    userId: req.userId!,
    userRole: req.userRole,
    format,
  });

  if (result.contentType === "application/pdf" && "pdf" in result && result.pdf) {
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    res.send(result.pdf);
    return;
  }

  res.setHeader("Content-Type", "application/json");
  res.json({
    html: "html" in result ? result.html : undefined,
    filename: result.filename,
    contentType: result.contentType,
  });
}
