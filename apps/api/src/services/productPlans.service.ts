import type { BillingPeriod, PlanMigrationResult, ProductPlan } from "@aeo-pcs/shared";
import { ENTITLED_SUBSCRIPTION_STATUSES } from "@aeo-pcs/shared";
import { env } from "../config/env";
import { ProductPlanModel } from "../models/ProductPlan";
import { SubscriptionModel } from "../models/Subscription";
import { AppError } from "../utils/AppError";
import * as razorpay from "./razorpay.service";

function serializePlan(
  doc: {
    _id: { toString(): string };
    name: string;
    slug: string;
    price: number;
    currency: string;
    priceLabel?: string | null;
    billingPeriod?: string | null;
    blurb?: string | null;
    features?: string[] | null;
    limits?: { visibilityRunsPerMonth?: number | null } | null;
    active?: boolean | null;
    sortOrder?: number | null;
    razorpayPlanId?: string | null;
  },
  opts?: { includeRazorpayPlanId?: boolean }
): ProductPlan {
  const billingPeriod: BillingPeriod =
    doc.billingPeriod === "yearly" ? "yearly" : "monthly";
  return {
    id: String(doc._id),
    name: doc.name,
    slug: doc.slug,
    price: doc.price,
    currency: doc.currency,
    priceLabel: doc.priceLabel || undefined,
    billingPeriod,
    blurb: doc.blurb || "",
    features: doc.features || [],
    limits: {
      visibilityRunsPerMonth: doc.limits?.visibilityRunsPerMonth ?? 3,
    },
    active: Boolean(doc.active),
    sortOrder: doc.sortOrder ?? 0,
    ...(opts?.includeRazorpayPlanId
      ? { razorpayPlanId: doc.razorpayPlanId || "" }
      : {}),
  };
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

async function syncRazorpayPlanId(input: {
  name: string;
  price: number;
  currency: string;
  billingPeriod: BillingPeriod;
  productPlanId: string;
  manualRazorpayPlanId?: string;
}): Promise<string> {
  const manual = (input.manualRazorpayPlanId || "").trim();
  if (manual) return manual;

  if (env.billingStub || !razorpay.isRazorpayConfigured()) {
    return "";
  }

  return razorpay.createRazorpayPlan({
    name: input.name,
    amountMajor: input.price,
    currency: input.currency,
    billingPeriod: input.billingPeriod,
    notes: { productPlanId: input.productPlanId },
  });
}

export async function listActiveCatalogPlans() {
  const plans = await ProductPlanModel.find({ active: true }).sort({ sortOrder: 1, price: 1 }).lean();
  return plans.map((p) => serializePlan(p));
}

export async function listAllProductPlans() {
  const plans = await ProductPlanModel.find().sort({ sortOrder: 1, name: 1 }).lean();
  return plans.map((p) => serializePlan(p, { includeRazorpayPlanId: true }));
}

export async function createProductPlan(input: {
  name: string;
  slug?: string;
  price: number;
  currency?: string;
  priceLabel?: string;
  billingPeriod?: BillingPeriod;
  blurb?: string;
  features?: string[];
  visibilityRunsPerMonth?: number;
  active?: boolean;
  sortOrder?: number;
  razorpayPlanId?: string;
}) {
  if (input.price <= 0) {
    throw new AppError("Price must be greater than zero", 400);
  }
  const slug = (input.slug || slugify(input.name)).toLowerCase();
  const existing = await ProductPlanModel.findOne({ slug });
  if (existing) throw new AppError("Plan slug already exists", 409);

  const billingPeriod: BillingPeriod = input.billingPeriod === "yearly" ? "yearly" : "monthly";
  const currency = (input.currency || "INR").toUpperCase();

  const plan = await ProductPlanModel.create({
    name: input.name,
    slug,
    price: input.price,
    currency,
    priceLabel: input.priceLabel || "",
    billingPeriod,
    blurb: input.blurb || "",
    features: input.features || [],
    limits: { visibilityRunsPerMonth: input.visibilityRunsPerMonth ?? 3 },
    active: input.active ?? true,
    sortOrder: input.sortOrder ?? 0,
    razorpayPlanId: "",
  });

  const razorpayPlanId = await syncRazorpayPlanId({
    name: plan.name,
    price: plan.price,
    currency: plan.currency,
    billingPeriod,
    productPlanId: String(plan._id),
    manualRazorpayPlanId: input.razorpayPlanId,
  });
  if (razorpayPlanId) {
    plan.razorpayPlanId = razorpayPlanId;
    await plan.save();
  }

  return {
    plan: serializePlan(plan, { includeRazorpayPlanId: true }),
    migration: null as PlanMigrationResult | null,
  };
}

export async function updateProductPlan(
  planId: string,
  input: Partial<{
    name: string;
    slug: string;
    price: number;
    currency: string;
    priceLabel: string;
    billingPeriod: BillingPeriod;
    blurb: string;
    features: string[];
    visibilityRunsPerMonth: number;
    active: boolean;
    sortOrder: number;
    razorpayPlanId: string;
  }>
) {
  const plan = await ProductPlanModel.findById(planId);
  if (!plan) throw new AppError("Plan not found", 404);

  if (input.price !== undefined && input.price <= 0) {
    throw new AppError("Price must be greater than zero", 400);
  }

  const prevPrice = plan.price;
  const prevCurrency = plan.currency;
  const prevPeriod = (plan.billingPeriod === "yearly" ? "yearly" : "monthly") as BillingPeriod;
  const prevRazorpayPlanId = plan.razorpayPlanId || "";

  if (input.name !== undefined) plan.name = input.name;
  if (input.slug !== undefined) {
    const slug = input.slug.toLowerCase();
    const clash = await ProductPlanModel.findOne({ slug, _id: { $ne: plan._id } });
    if (clash) throw new AppError("Plan slug already exists", 409);
    plan.slug = slug;
  }
  if (input.price !== undefined) plan.price = input.price;
  if (input.currency !== undefined) plan.currency = input.currency.toUpperCase();
  if (input.priceLabel !== undefined) plan.priceLabel = input.priceLabel;
  if (input.billingPeriod !== undefined) {
    plan.billingPeriod = input.billingPeriod === "yearly" ? "yearly" : "monthly";
  }
  if (input.blurb !== undefined) plan.blurb = input.blurb;
  if (input.features !== undefined) plan.features = input.features;
  if (input.visibilityRunsPerMonth !== undefined) {
    plan.limits = { visibilityRunsPerMonth: input.visibilityRunsPerMonth };
  }
  if (input.active !== undefined) plan.active = input.active;
  if (input.sortOrder !== undefined) plan.sortOrder = input.sortOrder;

  const nextPeriod = (plan.billingPeriod === "yearly" ? "yearly" : "monthly") as BillingPeriod;
  const billingChanged =
    plan.price !== prevPrice ||
    plan.currency !== prevCurrency ||
    nextPeriod !== prevPeriod;

  const manualId =
    input.razorpayPlanId !== undefined ? input.razorpayPlanId.trim() : undefined;

  let migration: PlanMigrationResult | null = null;

  if (billingChanged || (manualId !== undefined && manualId !== prevRazorpayPlanId)) {
    const newRazorpayPlanId = await syncRazorpayPlanId({
      name: plan.name,
      price: plan.price,
      currency: plan.currency,
      billingPeriod: nextPeriod,
      productPlanId: String(plan._id),
      manualRazorpayPlanId: manualId,
    });
    if (newRazorpayPlanId) {
      plan.razorpayPlanId = newRazorpayPlanId;
    } else if (manualId !== undefined) {
      plan.razorpayPlanId = manualId;
    }

    if (
      billingChanged &&
      plan.razorpayPlanId &&
      plan.razorpayPlanId !== prevRazorpayPlanId &&
      !env.billingStub &&
      razorpay.isRazorpayConfigured()
    ) {
      const { migrateSubscribersToRazorpayPlanAtCycleEnd } = await import(
        "./subscriptions.service"
      );
      migration = await migrateSubscribersToRazorpayPlanAtCycleEnd(
        String(plan._id),
        plan.razorpayPlanId
      );
    }
  } else if (manualId !== undefined) {
    plan.razorpayPlanId = manualId;
  }

  await plan.save();
  return {
    plan: serializePlan(plan, { includeRazorpayPlanId: true }),
    migration,
  };
}

export async function deleteProductPlan(planId: string) {
  const plan = await ProductPlanModel.findById(planId);
  if (!plan) throw new AppError("Plan not found", 404);

  const activeCount = await SubscriptionModel.countDocuments({
    planId: plan._id,
    status: { $in: ENTITLED_SUBSCRIPTION_STATUSES },
  });
  if (activeCount > 0) {
    throw new AppError(
      "Cannot delete a plan with active subscriptions. Deactivate the plan or reassign those businesses first.",
      409
    );
  }

  await ProductPlanModel.findByIdAndDelete(planId);
}

export { serializePlan };
