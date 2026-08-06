import { Router } from "express";
import * as visibilityController from "../controllers/visibility.controller";
import * as visibilityStreamController from "../controllers/visibilityStream.controller";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, validate } from "../middleware/validate";
import {
  createVisibilityJobValidators,
  jobIdParamValidators,
  runVisibilityJobValidators,
  startVisibilityJobValidators,
} from "../validators";

export const visibilityRouter = Router();

visibilityRouter.post(
  "/jobs",
  requireAuth,
  validate(createVisibilityJobValidators),
  asyncHandler(visibilityController.createJob)
);

visibilityRouter.post(
  "/jobs/start",
  requireAuth,
  validate(startVisibilityJobValidators),
  asyncHandler(visibilityController.startJob)
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

visibilityRouter.post(
  "/jobs/:jobId/run",
  requireAuth,
  validate(runVisibilityJobValidators),
  asyncHandler(visibilityController.runJob)
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
