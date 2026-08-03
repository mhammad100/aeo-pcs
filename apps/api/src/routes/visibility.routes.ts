import { Router } from "express";
import * as visibilityController from "../controllers/visibility.controller";
import * as visibilityStreamController from "../controllers/visibilityStream.controller";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, validate } from "../middleware/validate";
import { createVisibilityJobValidators, jobIdParamValidators } from "../validators";

export const visibilityRouter = Router();

visibilityRouter.post(
  "/jobs",
  requireAuth,
  validate(createVisibilityJobValidators),
  asyncHandler(visibilityController.createJob)
);

visibilityRouter.get("/jobs", requireAuth, asyncHandler(visibilityController.listJobs));

visibilityRouter.get("/jobs/active", requireAuth, asyncHandler(visibilityController.getActiveJob));

visibilityRouter.get("/insights", requireAuth, asyncHandler(visibilityController.getInsights));

visibilityRouter.get(
  "/jobs/:jobId/stream",
  requireAuth,
  validate(jobIdParamValidators),
  asyncHandler(visibilityStreamController.streamJob)
);

visibilityRouter.get(
  "/jobs/:jobId",
  requireAuth,
  validate(jobIdParamValidators),
  asyncHandler(visibilityController.getJob)
);

visibilityRouter.post(
  "/jobs/:jobId/cancel",
  requireAuth,
  validate(jobIdParamValidators),
  asyncHandler(visibilityController.cancelJob)
);
