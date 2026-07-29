import type { InvoiceRecord, SubscriptionInfo } from "@aeo-pcs/shared";
import { ENTITLED_SUBSCRIPTION_STATUSES } from "@aeo-pcs/shared";
import { BusinessModel } from "../models/Business";
import { InvoiceModel } from "../models/Invoice";
import { ProductPlanModel } from "../models/ProductPlan";
import { SubscriptionModel } from "../models/Subscription";
import { UserModel } from "../models/User";
import { VisibilityJobModel } from "../models/VisibilityJob";
import { AppError } from "../utils/AppError";
import { serializePlan } from "./productPlans.service";

function monthBounds(d = new Date()) {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1));
  return { start, end };
}

async function runsUsedThisMonth(businessId: string) {
  const { start, end } = monthBounds();
  return VisibilityJobModel.countDocuments({
    businessId,
    createdAt: { $gte: start, $lt: end },
    status: { $in: ["queued", "running", "completed"] },
  });
}

export async function getActiveSubscriptionForBusiness(businessId: string) {
  return SubscriptionModel.findOne({
    businessId,
    status: { $in: ENTITLED_SUBSCRIPTION_STATUSES },
  })
    .sort({ createdAt: -1 })
    .lean();
}

export async function getSubscriptionInfoForUser(userId: string): Promise<SubscriptionInfo> {
  const business = await BusinessModel.findOne({ ownerUserId: userId }).lean();
  if (!business) throw new AppError("Business not found", 404);

  const sub = await getActiveSubscriptionForBusiness(String(business._id));
  const runsUsed = await runsUsedThisMonth(String(business._id));

  if (!sub) {
    return {
      id: "",
      status: "canceled",
      currentPeriodStart: monthBounds().start.toISOString(),
      currentPeriodEnd: monthBounds().end.toISOString(),
      plan: null,
      runsUsedThisPeriod: runsUsed,
      runsLimit: 0,
    };
  }

  const plan = await ProductPlanModel.findById(sub.planId).lean();
  const runsLimit = plan?.limits?.visibilityRunsPerMonth ?? 0;

  return {
    id: String(sub._id),
    status: sub.status as SubscriptionInfo["status"],
    currentPeriodStart: new Date(sub.currentPeriodStart).toISOString(),
    currentPeriodEnd: new Date(sub.currentPeriodEnd).toISOString(),
    note: sub.note || undefined,
    plan: plan ? serializePlan(plan) : null,
    runsUsedThisPeriod: runsUsed,
    runsLimit,
  };
}

async function getEntitledSubscriptionContext(userId: string) {
  const business = await BusinessModel.findOne({ ownerUserId: userId }).lean();
  if (!business) throw new AppError("Business not found", 404);

  const sub = await getActiveSubscriptionForBusiness(String(business._id));
  if (!sub) {
    throw new AppError("Subscribe to a plan before using this feature.", 403);
  }

  const plan = await ProductPlanModel.findById(sub.planId).lean();
  if (!plan || !plan.active) {
    throw new AppError("Your subscription plan is no longer active. Choose a new plan.", 403);
  }

  return { business, plan };
}

export async function assertUserAccountActive(userId: string) {
  const user = await UserModel.findById(userId).lean();
  if (!user || user.status !== "active") {
    throw new AppError("Invalid or disabled account", 403);
  }
}

/** Active user account + entitled subscription (no run-limit check). */
export async function assertAiFeaturesAllowed(userId: string) {
  await assertUserAccountActive(userId);
  await getEntitledSubscriptionContext(userId);
}

export async function assertActiveSubscription(userId: string) {
  await assertAiFeaturesAllowed(userId);
  const business = await BusinessModel.findOne({ ownerUserId: userId }).lean();
  if (!business) throw new AppError("Business not found", 404);
  return business;
}

export async function assertVisibilityRunAllowed(userId: string) {
  await assertUserAccountActive(userId);
  const { business, plan } = await getEntitledSubscriptionContext(userId);
  const runsLimit = plan.limits?.visibilityRunsPerMonth ?? 0;
  const runsUsed = await runsUsedThisMonth(String(business._id));
  if (runsUsed >= runsLimit) {
    throw new AppError(
      `Visibility run limit reached (${runsLimit}/month on your current plan).`,
      403
    );
  }

  return business;
}

export async function subscribeUserToPlan(userId: string, planId: string) {
  const business = await BusinessModel.findOne({ ownerUserId: userId });
  if (!business) throw new AppError("Business not found", 404);

  const existing = await getActiveSubscriptionForBusiness(String(business._id));
  if (existing) {
    throw new AppError("You already have an active subscription.", 400);
  }

  const plan = await ProductPlanModel.findById(planId);
  if (!plan || !plan.active) {
    throw new AppError("Plan not found or unavailable", 404);
  }
  if (plan.price <= 0) {
    throw new AppError("Plan not available for subscription", 400);
  }

  return assignSubscription({
    businessId: String(business._id),
    planId: String(plan._id),
    status: "active",
    note: "Self-serve subscription",
    createInvoice: false,
  });
}

export async function assignSubscription(input: {
  businessId: string;
  planId: string;
  status?: SubscriptionInfo["status"];
  note?: string;
  createInvoice?: boolean;
}) {
  const business = await BusinessModel.findById(input.businessId);
  if (!business) throw new AppError("Business not found", 404);
  const plan = await ProductPlanModel.findById(input.planId);
  if (!plan) throw new AppError("Plan not found", 404);
  if (plan.price <= 0) {
    throw new AppError("Plan price must be greater than zero", 400);
  }

  const { start, end } = monthBounds();

  await SubscriptionModel.updateMany(
    { businessId: business._id, status: { $in: ENTITLED_SUBSCRIPTION_STATUSES } },
    { $set: { status: "canceled" } }
  );

  const sub = await SubscriptionModel.create({
    businessId: business._id,
    planId: plan._id,
    status: input.status || "active",
    currentPeriodStart: start,
    currentPeriodEnd: end,
    note: input.note || "",
  });

  let invoice: InvoiceRecord | null = null;
  if (input.createInvoice && plan.price > 0) {
    const inv = await InvoiceModel.create({
      businessId: business._id,
      subscriptionId: sub._id,
      amount: plan.price,
      currency: plan.currency,
      status: "paid",
      periodLabel: `${start.toISOString().slice(0, 7)}`,
      note: `Assigned ${plan.name}`,
    });
    invoice = serializeInvoice(inv);
  }

  return {
    subscription: {
      id: String(sub._id),
      status: sub.status,
      currentPeriodStart: start.toISOString(),
      currentPeriodEnd: end.toISOString(),
      note: sub.note || undefined,
      plan: serializePlan(plan),
      runsUsedThisPeriod: await runsUsedThisMonth(String(business._id)),
      runsLimit: plan.limits?.visibilityRunsPerMonth ?? 0,
    } satisfies SubscriptionInfo,
    invoice,
  };
}

export async function listSubscriptionsAdmin() {
  const subs = await SubscriptionModel.find().sort({ createdAt: -1 }).limit(100).lean();
  const planIds = [...new Set(subs.map((s) => String(s.planId)))];
  const businessIds = [...new Set(subs.map((s) => String(s.businessId)))];
  const [plans, businesses] = await Promise.all([
    ProductPlanModel.find({ _id: { $in: planIds } }).lean(),
    BusinessModel.find({ _id: { $in: businessIds } }).lean(),
  ]);
  const planById = new Map(plans.map((p) => [String(p._id), p]));
  const bizById = new Map(businesses.map((b) => [String(b._id), b]));

  return subs.map((s) => {
    const plan = planById.get(String(s.planId));
    const biz = bizById.get(String(s.businessId));
    return {
      id: String(s._id),
      status: s.status,
      currentPeriodStart: new Date(s.currentPeriodStart).toISOString(),
      currentPeriodEnd: new Date(s.currentPeriodEnd).toISOString(),
      note: s.note || undefined,
      businessId: String(s.businessId),
      businessName: biz?.name || "",
      plan: plan ? serializePlan(plan) : null,
    };
  });
}

function serializeInvoice(doc: {
  _id: { toString(): string };
  amount: number;
  currency: string;
  status: string;
  periodLabel?: string | null;
  note?: string | null;
  createdAt?: Date;
}): InvoiceRecord {
  return {
    id: String(doc._id),
    amount: doc.amount,
    currency: doc.currency,
    status: doc.status as InvoiceRecord["status"],
    periodLabel: doc.periodLabel || "",
    note: doc.note || undefined,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
  };
}

export async function listInvoicesForUser(userId: string) {
  const business = await BusinessModel.findOne({ ownerUserId: userId }).lean();
  if (!business) throw new AppError("Business not found", 404);
  const invoices = await InvoiceModel.find({ businessId: business._id })
    .sort({ createdAt: -1 })
    .lean();
  return invoices.map(serializeInvoice);
}

export async function createInvoiceAdmin(input: {
  businessId: string;
  amount: number;
  currency?: string;
  status?: InvoiceRecord["status"];
  periodLabel?: string;
  note?: string;
  subscriptionId?: string;
}) {
  const business = await BusinessModel.findById(input.businessId);
  if (!business) throw new AppError("Business not found", 404);

  const inv = await InvoiceModel.create({
    businessId: business._id,
    subscriptionId: input.subscriptionId || null,
    amount: input.amount,
    currency: (input.currency || "USD").toUpperCase(),
    status: input.status || "paid",
    periodLabel: input.periodLabel || "",
    note: input.note || "",
  });
  return serializeInvoice(inv);
}

export async function listInvoicesAdmin() {
  const invoices = await InvoiceModel.find().sort({ createdAt: -1 }).limit(100).lean();
  const businessIds = [...new Set(invoices.map((i) => String(i.businessId)))];
  const businesses = await BusinessModel.find({ _id: { $in: businessIds } }).lean();
  const bizById = new Map(businesses.map((b) => [String(b._id), b]));

  return invoices.map((inv) => ({
    ...serializeInvoice(inv),
    businessId: String(inv.businessId),
    businessName: bizById.get(String(inv.businessId))?.name || "",
  }));
}
