import type { ProductPlan } from "@aeo-pcs/shared";
import { ProductPlanModel } from "../models/ProductPlan";
import { AppError } from "../utils/AppError";

function serializePlan(doc: {
  _id: { toString(): string };
  name: string;
  slug: string;
  price: number;
  currency: string;
  priceLabel?: string | null;
  blurb?: string | null;
  features?: string[] | null;
  limits?: { visibilityRunsPerMonth?: number | null } | null;
  active?: boolean | null;
  sortOrder?: number | null;
}): ProductPlan {
  return {
    id: String(doc._id),
    name: doc.name,
    slug: doc.slug,
    price: doc.price,
    currency: doc.currency,
    priceLabel: doc.priceLabel || undefined,
    blurb: doc.blurb || "",
    features: doc.features || [],
    limits: {
      visibilityRunsPerMonth: doc.limits?.visibilityRunsPerMonth ?? 3,
    },
    active: Boolean(doc.active),
    sortOrder: doc.sortOrder ?? 0,
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

export async function listActiveCatalogPlans() {
  const plans = await ProductPlanModel.find({ active: true }).sort({ sortOrder: 1, price: 1 }).lean();
  return plans.map(serializePlan);
}

export async function listAllProductPlans() {
  const plans = await ProductPlanModel.find().sort({ sortOrder: 1, name: 1 }).lean();
  return plans.map(serializePlan);
}

export async function createProductPlan(input: {
  name: string;
  slug?: string;
  price: number;
  currency?: string;
  priceLabel?: string;
  blurb?: string;
  features?: string[];
  visibilityRunsPerMonth?: number;
  active?: boolean;
  sortOrder?: number;
}) {
  const slug = (input.slug || slugify(input.name)).toLowerCase();
  const existing = await ProductPlanModel.findOne({ slug });
  if (existing) throw new AppError("Plan slug already exists", 409);

  const plan = await ProductPlanModel.create({
    name: input.name,
    slug,
    price: input.price,
    currency: (input.currency || "USD").toUpperCase(),
    priceLabel: input.priceLabel || "",
    blurb: input.blurb || "",
    features: input.features || [],
    limits: { visibilityRunsPerMonth: input.visibilityRunsPerMonth ?? 3 },
    active: input.active ?? true,
    sortOrder: input.sortOrder ?? 0,
  });
  return serializePlan(plan);
}

export async function updateProductPlan(
  planId: string,
  input: Partial<{
    name: string;
    slug: string;
    price: number;
    currency: string;
    priceLabel: string;
    blurb: string;
    features: string[];
    visibilityRunsPerMonth: number;
    active: boolean;
    sortOrder: number;
  }>
) {
  const plan = await ProductPlanModel.findById(planId);
  if (!plan) throw new AppError("Plan not found", 404);

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
  if (input.blurb !== undefined) plan.blurb = input.blurb;
  if (input.features !== undefined) plan.features = input.features;
  if (input.visibilityRunsPerMonth !== undefined) {
    plan.limits = { visibilityRunsPerMonth: input.visibilityRunsPerMonth };
  }
  if (input.active !== undefined) plan.active = input.active;
  if (input.sortOrder !== undefined) plan.sortOrder = input.sortOrder;

  await plan.save();
  return serializePlan(plan);
}

export async function ensureDefaultPlans() {
  const count = await ProductPlanModel.countDocuments();
  if (count > 0) return;

  await ProductPlanModel.insertMany([
    {
      name: "Starter",
      slug: "starter",
      price: 0,
      currency: "USD",
      priceLabel: "Invite",
      blurb: "For single-location businesses getting their first AI visibility baseline.",
      features: ["Business profile & onboarding", "Visibility checks", "Action plan & report"],
      limits: { visibilityRunsPerMonth: 5 },
      active: true,
      sortOrder: 1,
    },
    {
      name: "Growth",
      slug: "growth",
      price: 99,
      currency: "USD",
      priceLabel: "$99/mo",
      blurb: "For teams that need recurring runs, history, and checklist tracking.",
      features: ["Month-over-month insights", "Action checklist", "Priority support"],
      limits: { visibilityRunsPerMonth: 30 },
      active: true,
      sortOrder: 2,
    },
    {
      name: "Agency",
      slug: "agency",
      price: 0,
      currency: "USD",
      priceLabel: "Custom",
      blurb: "For operators managing multiple brands under one roof.",
      features: ["Multi-business workflows", "Usage visibility", "Onboarding help"],
      limits: { visibilityRunsPerMonth: 100 },
      active: true,
      sortOrder: 3,
    },
  ]);
}

export { serializePlan };
