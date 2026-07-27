import { Router } from "express";
import * as reportsController from "../controllers/reports.controller";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, validate } from "../middleware/validate";
import { jobIdParamValidators } from "../validators";

export const reportsRouter = Router();

reportsRouter.get(
  "/:jobId",
  requireAuth,
  validate(jobIdParamValidators),
  asyncHandler(reportsController.getReport)
);
