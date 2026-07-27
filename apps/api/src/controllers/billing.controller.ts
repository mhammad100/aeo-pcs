import type { Response } from "express";
import type { AuthedRequest } from "../middleware/auth";
import * as productPlansService from "../services/productPlans.service";
import * as subscriptionsService from "../services/subscriptions.service";
import * as usageService from "../services/usage.service";

export async function listCatalogPlans(_req: AuthedRequest, res: Response) {
  await productPlansService.ensureDefaultPlans();
  const plans = await productPlansService.listActiveCatalogPlans();
  res.json({ plans });
}

export async function adminListPlans(_req: AuthedRequest, res: Response) {
  await productPlansService.ensureDefaultPlans();
  const plans = await productPlansService.listAllProductPlans();
  res.json({ plans });
}

export async function adminCreatePlan(req: AuthedRequest, res: Response) {
  const plan = await productPlansService.createProductPlan(req.body);
  res.status(201).json({ plan });
}

export async function adminUpdatePlan(req: AuthedRequest, res: Response) {
  const plan = await productPlansService.updateProductPlan(req.params.planId, req.body);
  res.json({ plan });
}

export async function adminListSubscriptions(_req: AuthedRequest, res: Response) {
  const subscriptions = await subscriptionsService.listSubscriptionsAdmin();
  res.json({ subscriptions });
}

export async function adminAssignSubscription(req: AuthedRequest, res: Response) {
  const result = await subscriptionsService.assignSubscription({
    businessId: req.body.businessId,
    planId: req.body.planId,
    status: req.body.status,
    note: req.body.note,
    createInvoice: req.body.createInvoice !== false,
  });
  res.status(201).json(result);
}

export async function adminListInvoices(_req: AuthedRequest, res: Response) {
  const invoices = await subscriptionsService.listInvoicesAdmin();
  res.json({ invoices });
}

export async function adminCreateInvoice(req: AuthedRequest, res: Response) {
  const invoice = await subscriptionsService.createInvoiceAdmin(req.body);
  res.status(201).json({ invoice });
}

export async function adminUsageSummary(req: AuthedRequest, res: Response) {
  const days = Number(req.query.days || 30);
  const summary = await usageService.getUsageProfitSummary(Number.isFinite(days) ? days : 30);
  res.json({ summary });
}

export async function adminListCostRates(_req: AuthedRequest, res: Response) {
  const rates = await usageService.listCostRates();
  res.json({ rates });
}

export async function adminUpsertCostRate(req: AuthedRequest, res: Response) {
  const rate = await usageService.upsertCostRate(req.body);
  res.json({ rate });
}

export async function mySubscription(req: AuthedRequest, res: Response) {
  await productPlansService.ensureDefaultPlans();
  const subscription = await subscriptionsService.getSubscriptionInfoForUser(req.userId!);
  res.json({ subscription });
}

export async function myInvoices(req: AuthedRequest, res: Response) {
  const invoices = await subscriptionsService.listInvoicesForUser(req.userId!);
  res.json({ invoices });
}

export async function myUsage(req: AuthedRequest, res: Response) {
  const days = Number(req.query.days || 30);
  const usage = await usageService.getBusinessUsageForUser(
    req.userId!,
    Number.isFinite(days) ? days : 30
  );
  res.json({ usage });
}
