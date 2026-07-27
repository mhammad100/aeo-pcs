import { Router } from "express";
import * as healthController from "../controllers/health.controller";
import { asyncHandler } from "../middleware/validate";
import { authRouter } from "./auth.routes";
import { adminRouter } from "./admin.routes";
import { businessesRouter } from "./businesses.routes";
import { businessSearchRouter } from "./businessSearch.routes";
import { promptsRouter } from "./prompts.routes";
import { visibilityRouter } from "./visibility.routes";
import { plansRouter } from "./plans.routes";
import { reportsRouter } from "./reports.routes";
import { actionPlanRouter } from "./actionPlan.routes";
import {
  billingRouter,
  catalogRouter,
  subscriptionsRouter,
  usageRouter,
} from "./billing.routes";

export const apiRouter = Router();

apiRouter.get("/health", asyncHandler(healthController.health));
apiRouter.use("/auth", authRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/businesses", businessesRouter);
apiRouter.use("/business", businessSearchRouter);
apiRouter.use("/prompts", promptsRouter);
apiRouter.use("/visibility", visibilityRouter);
apiRouter.use("/plans", plansRouter);
apiRouter.use("/action-plan", actionPlanRouter);
apiRouter.use("/catalog", catalogRouter);
apiRouter.use("/billing", billingRouter);
apiRouter.use("/subscriptions", subscriptionsRouter);
apiRouter.use("/usage", usageRouter);
apiRouter.use("/reports", reportsRouter);
