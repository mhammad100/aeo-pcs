import { Router } from "express";
import * as checklistController from "../controllers/checklist.controller";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, validate } from "../middleware/validate";
import { checklistKeyParamValidators, patchChecklistValidators } from "../validators";

export const actionPlanRouter = Router();

actionPlanRouter.get(
  "/checklist",
  requireAuth,
  asyncHandler(checklistController.getChecklist)
);

actionPlanRouter.patch(
  "/checklist/:key",
  requireAuth,
  validate([...checklistKeyParamValidators, ...patchChecklistValidators]),
  asyncHandler(checklistController.patchChecklistItem)
);
