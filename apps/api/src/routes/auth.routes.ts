import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, validate } from "../middleware/validate";
import { loginValidators, signupValidators } from "../validators";

export const authRouter = Router();

authRouter.post("/login", validate(loginValidators), asyncHandler(authController.login));
authRouter.post("/signup", validate(signupValidators), asyncHandler(authController.signup));
authRouter.get("/me", requireAuth, asyncHandler(authController.me));
