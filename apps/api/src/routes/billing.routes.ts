import { Router } from "express";
import * as billingController from "../controllers/billing.controller";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, validate } from "../middleware/validate";
import {
  createInvoiceValidators,
  createProductPlanValidators,
  planIdParamValidators,
  subscribeValidators,
  updateProductPlanValidators,
  upsertCostRateValidators,
} from "../validators";

export const catalogRouter = Router();
catalogRouter.get("/plans", asyncHandler(billingController.listCatalogPlans));

export const billingRouter = Router();
billingRouter.get("/invoices", requireAuth, asyncHandler(billingController.myInvoices));

export const subscriptionsRouter = Router();
subscriptionsRouter.get("/me", requireAuth, asyncHandler(billingController.mySubscription));
subscriptionsRouter.post(
  "/subscribe",
  requireAuth,
  validate(subscribeValidators),
  asyncHandler(billingController.subscribeToPlan)
);

export const usageRouter = Router();
usageRouter.get("/me", requireAuth, asyncHandler(billingController.myUsage));

export function mountAdminBillingRoutes(adminRouter: Router) {
  adminRouter.get("/plans", asyncHandler(billingController.adminListPlans));
  adminRouter.post(
    "/plans",
    validate(createProductPlanValidators),
    asyncHandler(billingController.adminCreatePlan)
  );
  adminRouter.patch(
    "/plans/:planId",
    validate([...planIdParamValidators, ...updateProductPlanValidators]),
    asyncHandler(billingController.adminUpdatePlan)
  );
  adminRouter.delete(
    "/plans/:planId",
    validate(planIdParamValidators),
    asyncHandler(billingController.adminDeletePlan)
  );

  adminRouter.get("/subscriptions", asyncHandler(billingController.adminListSubscriptions));

  adminRouter.get("/invoices", asyncHandler(billingController.adminListInvoices));
  adminRouter.post(
    "/invoices",
    validate(createInvoiceValidators),
    asyncHandler(billingController.adminCreateInvoice)
  );

  adminRouter.get("/usage/summary", asyncHandler(billingController.adminUsageSummary));
  adminRouter.get("/cost-rates", asyncHandler(billingController.adminListCostRates));
  adminRouter.put(
    "/cost-rates",
    validate(upsertCostRateValidators),
    asyncHandler(billingController.adminUpsertCostRate)
  );
}
