import { Router } from "express";
import * as businessSearchController from "../controllers/businessSearch.controller";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, validate } from "../middleware/validate";
import { businessSearchValidators } from "../validators";

export const businessSearchRouter = Router();

businessSearchRouter.post(
  "/search",
  requireAuth,
  validate(businessSearchValidators),
  asyncHandler(businessSearchController.search)
);
