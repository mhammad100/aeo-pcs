import { Router } from "express";
import * as plansController from "../controllers/plans.controller";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, validate } from "../middleware/validate";
import { buildPlanValidators, generatePlanItemValidators } from "../validators";

export const plansRouter = Router();

plansRouter.post("/", requireAuth, validate(buildPlanValidators), asyncHandler(plansController.buildPlan));

plansRouter.post(
  "/items/generate",
  requireAuth,
  validate(generatePlanItemValidators),
  asyncHandler(plansController.generateItem)
);
