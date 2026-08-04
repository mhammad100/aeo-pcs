import type { InvoiceRecord, SubscriptionInfo } from "@aeo-pcs/shared";
import { COPY, ENTITLED_SUBSCRIPTION_STATUSES } from "@aeo-pcs/shared";
import { env } from "../config/env";
import { BusinessModel } from "../models/Business";
import { InvoiceModel } from "../models/Invoice";
import { ProductPlanModel } from "../models/ProductPlan";
import { SubscriptionModel } from "../models/Subscription";
import { UserModel } from "../models/User";
import { VisibilityJobModel } from "../models/VisibilityJob";
import { AppError } from "../utils/AppError";
import { serializePlan } from "./productPlans.service";
import * as razorpay from "./razorpay.service";

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
    status: {
      $in: ["generating", "ready", "queued", "running", "completed", "cancelled"],
    },
  });
}

export async function getActiveSubscriptionForBusiness(businessId: string) {
  const now = new Date();
  return SubscriptionModel.findOne({
    businessId,
    status: { $in: ENTITLED_SUBSCRIPTION_STATUSES },
    currentPeriodEnd: { $gt: now },
  })
    .sort({ createdAt: -1 })
    .lean();
}

async function toSubscriptionInfo(
  sub: {
    _id: { toString(): string };
    status: string;
    currentPeriodStart: Date;
    currentPeriodEnd: Date;
    note?: string | null;
    planId: { toString(): string };
    cancelAtPeriodEnd?: boolean | null;
    canceledAt?: Date | null;
  },
  businessId: string
): Promise<SubscriptionInfo> {
  const plan = await ProductPlanModel.findById(sub.planId).lean();
  const runsLimit = plan?.limits?.visibilityRunsPerMonth ?? 0;
  return {
    id: String(sub._id),
    status: sub.status as SubscriptionInfo["status"],
    currentPeriodStart: new Date(sub.currentPeriodStart).toISOString(),
    currentPeriodEnd: new Date(sub.currentPeriodEnd).toISOString(),
    note: sub.note || undefined,
    plan: plan ? serializePlan(plan) : null,
    runsUsedThisPeriod: await runsUsedThisMonth(businessId),
    runsLimit,
    cancelAtPeriodEnd: Boolean(sub.cancelAtPeriodEnd),
    canceledAt: sub.canceledAt ? new Date(sub.canceledAt).toISOString() : undefined,
  };
}

export async function getSubscriptionInfoForUser(userId: string): Promise<SubscriptionInfo> {
  const business = await BusinessModel.findOne({ ownerUserId: userId }).lean();
  if (!business) throw new AppError("Business not found", 404);

  const businessId = String(business._id);
  const active = await getActiveSubscriptionForBusiness(businessId);
  const sub =
    active ||
    (await SubscriptionModel.findOne({ businessId: business._id }).sort({ createdAt: -1 }).lean());
  const runsUsed = await runsUsedThisMonth(businessId);

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

  return toSubscriptionInfo(sub, businessId);
}

async function getEntitledSubscriptionContext(userId: string) {
  const business = await BusinessModel.findOne({ ownerUserId: userId }).lean();
  if (!business) throw new AppError("Business not found", 404);

  const sub = await getActiveSubscriptionForBusiness(String(business._id));
  if (!sub) {
    throw new AppError(COPY.billing.subscribeRequired, 403);
  }

  const plan = await ProductPlanModel.findById(sub.planId).lean();
  if (!plan || !plan.active) {
    throw new AppError(COPY.billing.planUnavailable, 403);
  }

  return { business, plan, sub };
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

export type CheckoutResult =
  | {
      mode: "stub";
      subscription: SubscriptionInfo;
      invoice: InvoiceRecord | null;
    }
  | {
      mode: "razorpay";
      keyId: string;
      razorpaySubscriptionId: string;
      subscription: SubscriptionInfo;
      planName: string;
      amount: number;
      currency: string;
    };

/** Start checkout (Razorpay) or activate immediately in billing-stub mode. */
export async function checkoutSubscription(userId: string, planId: string): Promise<CheckoutResult> {
  if (env.billingStub) {
    const result = await subscribeUserToPlan(userId, planId);
    return { mode: "stub", ...result };
  }

  if (!razorpay.isRazorpayConfigured()) {
    throw new AppError(COPY.billing.billingUnavailable, 503);
  }

  const business = await BusinessModel.findOne({ ownerUserId: userId });
  if (!business) throw new AppError("Business not found", 404);

  const user = await UserModel.findById(userId).lean();
  if (!user) throw new AppError("User not found", 404);

  const existing = await getActiveSubscriptionForBusiness(String(business._id));
  if (existing && String(existing.planId) === planId) {
    throw new AppError(COPY.billing.alreadyOnPlan, 400);
  }

  const plan = await ProductPlanModel.findById(planId);
  if (!plan || !plan.active) {
    throw new AppError(COPY.billing.planUnavailable, 404);
  }
  if (plan.price <= 0) {
    throw new AppError(COPY.billing.planUnavailable, 400);
  }
  if (!plan.razorpayPlanId) {
    throw new AppError(COPY.billing.planNotReady, 400);
  }

  // Cancel prior incomplete checkouts for this business.
  const stale = await SubscriptionModel.find({
    businessId: business._id,
    status: "incomplete",
    razorpaySubscriptionId: { $ne: "" },
  });
  for (const s of stale) {
    try {
      if (s.razorpaySubscriptionId) {
        await razorpay.cancelRazorpaySubscription(s.razorpaySubscriptionId, false);
      }
    } catch {
      // Best-effort cleanup of abandoned checkouts.
    }
    s.status = "canceled";
    s.canceledAt = new Date();
    await s.save();
  }

  const customerId = await razorpay.ensureRazorpayCustomer({
    existingCustomerId: business.razorpayCustomerId || undefined,
    name: business.name || user.email,
    email: user.email,
    notes: { businessId: String(business._id), userId },
  });
  if (!business.razorpayCustomerId) {
    business.razorpayCustomerId = customerId;
    await business.save();
  }

  const rzpSub = await razorpay.createRazorpaySubscription({
    planId: plan.razorpayPlanId,
    customerId,
    notes: {
      businessId: String(business._id),
      planId: String(plan._id),
      userId,
    },
  });

  const { start, end } = monthBounds();
  const sub = await SubscriptionModel.create({
    businessId: business._id,
    planId: plan._id,
    status: "incomplete",
    currentPeriodStart: start,
    currentPeriodEnd: end,
    note: existing ? "Plan change checkout" : "Subscription checkout",
    razorpaySubscriptionId: String(rzpSub.id),
    razorpayCustomerId: customerId,
    cancelAtPeriodEnd: false,
  });

  return {
    mode: "razorpay",
    keyId: env.razorpayKeyId,
    razorpaySubscriptionId: String(rzpSub.id),
    subscription: await toSubscriptionInfo(sub, String(business._id)),
    planName: plan.name,
    amount: plan.price,
    currency: plan.currency,
  };
}

/** Legacy/stub path: activate plan without payment. Used when BILLING_STUB is on. */
export async function subscribeUserToPlan(userId: string, planId: string) {
  if (!env.billingStub) {
    throw new AppError(COPY.billing.checkoutRequired, 400);
  }

  const business = await BusinessModel.findOne({ ownerUserId: userId });
  if (!business) throw new AppError("Business not found", 404);

  const existing = await getActiveSubscriptionForBusiness(String(business._id));
  if (existing && String(existing.planId) === planId) {
    throw new AppError(COPY.billing.alreadyOnPlan, 400);
  }

  const plan = await ProductPlanModel.findById(planId);
  if (!plan || !plan.active) {
    throw new AppError(COPY.billing.planUnavailable, 404);
  }
  if (plan.price <= 0) {
    throw new AppError(COPY.billing.planUnavailable, 400);
  }

  return assignSubscription({
    businessId: String(business._id),
    planId: String(plan._id),
    status: "active",
    note: existing ? "Plan change" : "Subscription",
    createInvoice: true,
    invoiceNote: plan.name,
  });
}

export async function verifyCheckoutPayment(
  userId: string,
  input: { razorpayPaymentId: string; razorpaySubscriptionId: string; razorpaySignature: string }
) {
  razorpay.verifySubscriptionPaymentSignature({
    paymentId: input.razorpayPaymentId,
    subscriptionId: input.razorpaySubscriptionId,
    signature: input.razorpaySignature,
  });

  const business = await BusinessModel.findOne({ ownerUserId: userId });
  if (!business) throw new AppError("Business not found", 404);

  const sub = await SubscriptionModel.findOne({
    businessId: business._id,
    razorpaySubscriptionId: input.razorpaySubscriptionId,
  });
  if (!sub) throw new AppError(COPY.billing.subscriptionNotFound, 404);

  await activateLocalSubscription(sub, {
    paymentId: input.razorpayPaymentId,
    note: "Activated after checkout",
  });

  return { subscription: await toSubscriptionInfo(sub, String(business._id)) };
}

export async function cancelSubscriptionForUser(userId: string) {
  const business = await BusinessModel.findOne({ ownerUserId: userId });
  if (!business) throw new AppError("Business not found", 404);

  const sub = await getActiveSubscriptionForBusiness(String(business._id));
  if (!sub) throw new AppError(COPY.billing.cancelNone, 400);

  const doc = await SubscriptionModel.findById(sub._id);
  if (!doc) throw new AppError(COPY.billing.subscriptionNotFound, 404);

  if (doc.cancelAtPeriodEnd) {
    return { subscription: await toSubscriptionInfo(doc, String(business._id)) };
  }

  if (doc.razorpaySubscriptionId && razorpay.isRazorpayConfigured() && !env.billingStub) {
    await razorpay.cancelRazorpaySubscription(doc.razorpaySubscriptionId, true);
  }

  doc.cancelAtPeriodEnd = true;
  doc.canceledAt = new Date();
  doc.note = doc.note ? `${doc.note}; Cancel at period end` : "Cancel at period end";
  await doc.save();

  return { subscription: await toSubscriptionInfo(doc, String(business._id)) };
}

export async function assignSubscription(input: {
  businessId: string;
  planId: string;
  status?: SubscriptionInfo["status"];
  note?: string;
  createInvoice?: boolean;
  invoiceNote?: string;
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
    { businessId: business._id, status: { $in: [...ENTITLED_SUBSCRIPTION_STATUSES, "incomplete"] } },
    { $set: { status: "canceled", canceledAt: new Date() } }
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
      note: input.invoiceNote || plan.name,
    });
    invoice = serializeInvoice(inv);
  }

  return {
    subscription: await toSubscriptionInfo(sub, String(business._id)),
    invoice,
  };
}

async function activateLocalSubscription(
  sub: InstanceType<typeof SubscriptionModel>,
  opts?: {
    periodStart?: Date | null;
    periodEnd?: Date | null;
    paymentId?: string;
    razorpayInvoiceId?: string;
    note?: string;
  }
) {
  const plan = await ProductPlanModel.findById(sub.planId);
  if (!plan) throw new AppError("Plan not found", 404);

  const { start, end } = monthBounds();
  const periodStart = opts?.periodStart || start;
  const periodEnd = opts?.periodEnd || end;

  // Cancel prior Razorpay subs when switching plans (best effort), then supersede locally.
  const prior = await SubscriptionModel.find({
    businessId: sub.businessId,
    _id: { $ne: sub._id },
    status: { $in: [...ENTITLED_SUBSCRIPTION_STATUSES, "incomplete"] },
    razorpaySubscriptionId: { $nin: ["", null] },
  }).limit(10);

  for (const p of prior) {
    if (!p.razorpaySubscriptionId || !razorpay.isRazorpayConfigured()) continue;
    try {
      await razorpay.cancelRazorpaySubscription(p.razorpaySubscriptionId, false);
    } catch {
      // Ignore — may already be cancelled.
    }
  }

  await SubscriptionModel.updateMany(
    {
      businessId: sub.businessId,
      _id: { $ne: sub._id },
      status: { $in: [...ENTITLED_SUBSCRIPTION_STATUSES, "incomplete"] },
    },
    { $set: { status: "canceled", canceledAt: new Date() } }
  );

  sub.status = "active";
  sub.currentPeriodStart = periodStart;
  sub.currentPeriodEnd = periodEnd;
  sub.cancelAtPeriodEnd = false;
  if (opts?.note) sub.note = opts.note;
  await sub.save();

  if (opts?.paymentId) {
    const existing = await InvoiceModel.findOne({ razorpayPaymentId: opts.paymentId });
    if (!existing) {
      await InvoiceModel.create({
        businessId: sub.businessId,
        subscriptionId: sub._id,
        amount: plan.price,
        currency: plan.currency,
        status: "paid",
        periodLabel: periodStart.toISOString().slice(0, 7),
        note: plan.name,
        razorpayPaymentId: opts.paymentId,
        razorpayInvoiceId: opts.razorpayInvoiceId || "",
      });
    }
  }
}

type RazorpayWebhookPayload = {
  event?: string;
  payload?: {
    subscription?: { entity?: Record<string, unknown> };
    payment?: { entity?: Record<string, unknown> };
    invoice?: { entity?: Record<string, unknown> };
  };
};

export async function handleRazorpayWebhook(rawBody: Buffer, signature: string) {
  razorpay.verifyWebhookSignature(rawBody, signature);
  const body = JSON.parse(rawBody.toString("utf8")) as RazorpayWebhookPayload;
  const event = body.event || "";
  const subEntity = body.payload?.subscription?.entity;
  const paymentEntity = body.payload?.payment?.entity;
  const invoiceEntity = body.payload?.invoice?.entity;

  const rzpSubId = subEntity?.id ? String(subEntity.id) : "";
  if (!rzpSubId && !event.startsWith("payment.")) {
    return { ok: true, ignored: true };
  }

  const sub = rzpSubId
    ? await SubscriptionModel.findOne({ razorpaySubscriptionId: rzpSubId })
    : null;

  if (event === "subscription.activated" || event === "subscription.charged") {
    if (!sub) return { ok: true, ignored: true };
    const periodStart = razorpay.unixToDate(Number(subEntity?.current_start));
    const periodEnd = razorpay.unixToDate(Number(subEntity?.current_end));
    const paymentId = paymentEntity?.id ? String(paymentEntity.id) : undefined;
    const rzpInvoiceId = invoiceEntity?.id ? String(invoiceEntity.id) : undefined;
    await activateLocalSubscription(sub, {
      periodStart,
      periodEnd,
      paymentId,
      razorpayInvoiceId: rzpInvoiceId,
      note: event,
    });
    return { ok: true };
  }

  if (event === "subscription.pending" || event === "subscription.halted") {
    if (!sub) return { ok: true, ignored: true };
    if (sub.status !== "incomplete") {
      sub.status = "past_due";
      await sub.save();
    }
    return { ok: true };
  }

  if (event === "subscription.cancelled" || event === "subscription.completed") {
    if (!sub) return { ok: true, ignored: true };
    const periodEnd = razorpay.unixToDate(Number(subEntity?.current_end));
    if (periodEnd) sub.currentPeriodEnd = periodEnd;
    sub.canceledAt = sub.canceledAt || new Date();
    // Keep access through the paid period when Razorpay cancels at cycle end.
    if (periodEnd && periodEnd.getTime() > Date.now() && event === "subscription.cancelled") {
      sub.cancelAtPeriodEnd = true;
      if (sub.status === "incomplete") sub.status = "canceled";
      // leave active/trialing/past_due as-is until period ends (enforced by currentPeriodEnd)
    } else {
      sub.status = "canceled";
      sub.cancelAtPeriodEnd = false;
    }
    await sub.save();
    return { ok: true };
  }

  if (event === "payment.failed") {
    if (sub && sub.status === "active") {
      sub.status = "past_due";
      await sub.save();
    }
    return { ok: true };
  }

  return { ok: true, ignored: true };
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
      cancelAtPeriodEnd: Boolean(s.cancelAtPeriodEnd),
      razorpaySubscriptionId: s.razorpaySubscriptionId || undefined,
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
  razorpayPaymentId?: string | null;
}): InvoiceRecord {
  return {
    id: String(doc._id),
    amount: doc.amount,
    currency: doc.currency,
    status: doc.status as InvoiceRecord["status"],
    periodLabel: doc.periodLabel || "",
    note: doc.note || undefined,
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    razorpayPaymentId: doc.razorpayPaymentId || undefined,
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
