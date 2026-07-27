import { Router } from "express";
import * as promptsController from "../controllers/prompts.controller";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, validate } from "../middleware/validate";
import { generatePromptsValidators } from "../validators";

export const promptsRouter = Router();

promptsRouter.post(
  "/generate",
  requireAuth,
  validate(generatePromptsValidators),
  asyncHandler(promptsController.generate)
);
