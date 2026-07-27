import { Router } from "express";
import * as visibilityController from "../controllers/visibility.controller";
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

visibilityRouter.get(
  "/jobs/:jobId",
  requireAuth,
  validate(jobIdParamValidators),
  asyncHandler(visibilityController.getJob)
);
