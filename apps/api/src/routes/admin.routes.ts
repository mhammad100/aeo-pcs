import { Router } from "express";
import * as adminController from "../controllers/admin.controller";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler, validate } from "../middleware/validate";
import { createAdminUserValidators, setUserStatusValidators } from "../validators";

export const adminRouter = Router();

adminRouter.use(requireAuth, requireRole("admin"));

adminRouter.get("/users", asyncHandler(adminController.listUsers));
adminRouter.get("/businesses", asyncHandler(adminController.listBusinesses));
adminRouter.post(
  "/users",
  validate(createAdminUserValidators),
  asyncHandler(adminController.createBusinessUser)
);
adminRouter.patch(
  "/users/:userId/status",
  validate(setUserStatusValidators),
  asyncHandler(adminController.setUserStatus)
);
