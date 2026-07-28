import { Router } from "express";
import * as businessesController from "../controllers/businesses.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler, validate } from "../middleware/validate";
import { businessProfileValidators } from "../validators";

export const businessesRouter = Router();

businessesRouter.use(requireAuth, requireRole("business"));
businessesRouter.get("/me", asyncHandler(businessesController.getMe));
businessesRouter.put(
  "/me",
  validate(businessProfileValidators),
  asyncHandler(businessesController.updateMe)
);
