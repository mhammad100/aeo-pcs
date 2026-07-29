import { Router } from "express";
import * as aeoSettingsController from "../controllers/aeoSettings.controller";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/validate";

export const settingsRouter = Router();

settingsRouter.get(
  "/runtime",
  requireAuth,
  asyncHandler(aeoSettingsController.getRuntimeAeoSettings)
);
