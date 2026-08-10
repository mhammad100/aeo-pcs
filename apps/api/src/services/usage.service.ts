import type {
  CostRate,
  MoneyAmount,
  UsageBusinessRow,
  UsageProfitSummary,
  UsageSummaryRow,
} from "@aeo-pcs/shared";
import { DEFAULT_USD_TO_INR_RATE } from "@aeo-pcs/shared";
import { CostRateModel } from "../models/CostRate";
import { InvoiceModel } from "../models/Invoice";
import { UsageEventModel } from "../models/UsageEvent";
import { AppError } from "../utils/AppError";

function serializeRate(doc: {
  _id: { toString(): string };
  model: string;
  inputPer1MTokens: number;
  outputPer1MTokens: number;
  currency?: string | null;
}): CostRate {
  return {
    id: String(doc._id),
    model: doc.model,
    inputPer1MTokens: doc.inputPer1MTokens,
    outputPer1MTokens: doc.outputPer1MTokens,
    currency: doc.currency || "USD",
  };
}

/** Cost rates are seeded from AeoSettings (ensureAeoSettings). No env model fallback. */
export async function ensureDefaultCostRates() {
  // no-op — rates come from Admin → Settings via ensureAeoSettings / migrations
}

export async function listCostRates() {
  await ensureDefaultCostRates();
  const rates = await CostRateModel.find().sort({ model: 1 }).lean();
  return rates.map(serializeRate);
}

export async function upsertCostRate(input: {
  model: string;
  inputPer1MTokens: number;
  outputPer1MTokens: number;
  currency?: string;
}) {
  const rate = await CostRateModel.findOneAndUpdate(
    { model: input.model },
    {
      $set: {
        inputPer1MTokens: input.inputPer1MTokens,
        outputPer1MTokens: input.outputPer1MTokens,
        currency: (input.currency || "USD").toUpperCase(),
      },
    },
    { upsert: true, new: true }
  );
  return serializeRate(rate);
}

function estimateCost(
  inputTokens: number,
  outputTokens: number,
  rate: { inputPer1MTokens: number; outputPer1MTokens: number } | undefined
) {
  if (!rate) return 0;
  return (
    (inputTokens / 1_000_000) * rate.inputPer1MTokens +
    (outputTokens / 1_000_000) * rate.outputPer1MTokens
  );
}

async function rateForModel(model: string) {
  await ensureDefaultCostRates();
  const rate =
    (await CostRateModel.findOne({ model }).lean()) ||
    (await CostRateModel.findOne().sort({ updatedAt: -1 }).lean());
  if (!rate) {
    return {
      inputPer1MTokens: 3,
      outputPer1MTokens: 15,
      currency: "USD",
    };
  }
  return {
    inputPer1MTokens: rate.inputPer1MTokens,
    outputPer1MTokens: rate.outputPer1MTokens,
    currency: rate.currency || "USD",
  };
}

export async function logUsageEvent(input: {
  userId?: string | null;
  businessId?: string | null;
  feature: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** When set (from AeoSettings), used instead of CostRate lookup. */
  pricing?: {
    inputPer1MTokens: number;
    outputPer1MTokens: number;
    currency?: string;
  };
  refs?: Record<string, unknown>;
}) {
  try {
    const inputTokens = Math.max(0, Math.round(input.inputTokens || 0));
    const outputTokens = Math.max(0, Math.round(input.outputTokens || 0));
    const rate = input.pricing
      ? {
          inputPer1MTokens: input.pricing.inputPer1MTokens,
          outputPer1MTokens: input.pricing.outputPer1MTokens,
          currency: (input.pricing.currency || "USD").toUpperCase(),
        }
      : await rateForModel(input.model);
    const estimatedCost = estimateCost(inputTokens, outputTokens, rate);

    await UsageEventModel.create({
      userId: input.userId || null,
      businessId: input.businessId || null,
      feature: input.feature,
      model: input.model,
      inputTokens,
      outputTokens,
      inputPer1MTokens: rate.inputPer1MTokens,
      outputPer1MTokens: rate.outputPer1MTokens,
      estimatedCost,
      currency: rate.currency,
      refs: input.refs || {},
    });
  } catch (error) {
    // Never fail the primary LLM call on logging errors
    console.error("Error logging usage event", error);
  }
}

function eventCost(
  ev: {
    inputTokens?: number | null;
    outputTokens?: number | null;
    estimatedCost?: number | null;
    model?: string | null;
  },
  rateByModel: Map<string, CostRate>
) {
  if (typeof ev.estimatedCost === "number") return ev.estimatedCost;
  const inTok = ev.inputTokens || 0;
  const outTok = ev.outputTokens || 0;
  return estimateCost(inTok, outTok, rateByModel.get(ev.model || ""));
}

const round2 = (n: number) => Math.round(n * 100) / 100;
const round4 = (n: number) => Math.round(n * 10000) / 10000;

function toInr(amount: number, currency: string, usdToInrRate: number): number {
  const c = (currency || "INR").toUpperCase();
  if (c === "INR") return amount;
  if (c === "USD") return amount * usdToInrRate;
  // Unknown currency: do not invent a conversion.
  return 0;
}

function bumpMoney(map: Map<string, number>, currency: string, amount: number) {
  const c = (currency || "INR").toUpperCase();
  map.set(c, (map.get(c) || 0) + amount);
}

function moneyMapToList(map: Map<string, number>): MoneyAmount[] {
  return [...map.entries()]
    .map(([currency, amount]) => ({ currency, amount: round2(amount) }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

export async function getUsageProfitSummary(days = 30): Promise<UsageProfitSummary> {
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - days * 24 * 60 * 60 * 1000);
  const rates = await listCostRates();
  const rateByModel = new Map(rates.map((r) => [r.model, r]));
  // Dynamic import avoids circular dependency with aeoSettings.service → upsertCostRate.
  const { getAeoSettings } = await import("./aeoSettings.service");
  const settings = await getAeoSettings();
  const usdToInrRate = settings.usdToInrRate || DEFAULT_USD_TO_INR_RATE;

  const events = await UsageEventModel.find({
    createdAt: { $gte: periodStart, $lte: periodEnd },
  })
    .select("businessId feature model inputTokens outputTokens estimatedCost createdAt")
    .lean();

  const byFeatureMap = new Map<string, UsageSummaryRow>();
  const byModelMap = new Map<string, UsageSummaryRow>();
  const byDayMap = new Map<string, UsageSummaryRow>();
  type BizAgg = {
    calls: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: number;
    revenueByCurrency: Map<string, number>;
  };
  const byBusinessMap = new Map<string, BizAgg>();

  let calls = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let estimatedCostUsd = 0;

  const ensureBiz = (businessId: string): BizAgg => {
    let row = byBusinessMap.get(businessId);
    if (!row) {
      row = {
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCostUsd: 0,
        revenueByCurrency: new Map(),
      };
      byBusinessMap.set(businessId, row);
    }
    return row;
  };

  for (const ev of events) {
    const inTok = ev.inputTokens || 0;
    const outTok = ev.outputTokens || 0;
    const cost = eventCost(ev, rateByModel);
    calls += 1;
    inputTokens += inTok;
    outputTokens += outTok;
    estimatedCostUsd += cost;

    const bump = (map: Map<string, UsageSummaryRow>, key: string) => {
      const row = map.get(key) || { key, inputTokens: 0, outputTokens: 0, calls: 0, estimatedCost: 0 };
      row.inputTokens += inTok;
      row.outputTokens += outTok;
      row.calls += 1;
      row.estimatedCost += cost;
      map.set(key, row);
    };

    bump(byFeatureMap, ev.feature || "unknown");
    bump(byModelMap, ev.model || "unknown");
    bump(byDayMap, new Date(ev.createdAt).toISOString().slice(0, 10));

    if (ev.businessId) {
      const biz = ensureBiz(String(ev.businessId));
      biz.calls += 1;
      biz.inputTokens += inTok;
      biz.outputTokens += outTok;
      biz.estimatedCostUsd += cost;
    }
  }

  const paidInvoices = await InvoiceModel.find({
    status: "paid",
    createdAt: { $gte: periodStart, $lte: periodEnd },
  })
    .select("amount currency businessId")
    .lean();

  const revenueByCurrencyMap = new Map<string, number>();
  for (const inv of paidInvoices) {
    const currency = (inv.currency || "INR").toUpperCase();
    const amount = inv.amount || 0;
    bumpMoney(revenueByCurrencyMap, currency, amount);
    if (inv.businessId) {
      const biz = ensureBiz(String(inv.businessId));
      bumpMoney(biz.revenueByCurrency, currency, amount);
    }
  }

  const revenueByCurrency = moneyMapToList(revenueByCurrencyMap);
  const revenueInr = round2(
    revenueByCurrency.reduce((sum, r) => sum + toInr(r.amount, r.currency, usdToInrRate), 0)
  );
  const estimatedCostInr = round2(estimatedCostUsd * usdToInrRate);
  const marginInr = round2(revenueInr - estimatedCostInr);

  const { BusinessModel } = await import("../models/Business");
  const { UserModel } = await import("../models/User");
  const { SubscriptionModel } = await import("../models/Subscription");
  const { ProductPlanModel } = await import("../models/ProductPlan");
  const { ENTITLED_SUBSCRIPTION_STATUSES } = await import("@aeo-pcs/shared");

  // Include entitled subscribers even if they had no usage/invoices in the window.
  const activeSubs = await SubscriptionModel.find({
    status: { $in: [...ENTITLED_SUBSCRIPTION_STATUSES] },
  })
    .sort({ createdAt: -1 })
    .lean();
  for (const sub of activeSubs) {
    ensureBiz(String(sub.businessId));
  }

  const businessIds = [...byBusinessMap.keys()];
  const businesses = businessIds.length
    ? await BusinessModel.find({ _id: { $in: businessIds } }).lean()
    : [];
  const ownerIds = businesses.map((b) => b.ownerUserId).filter(Boolean);
  const owners = ownerIds.length
    ? await UserModel.find({ _id: { $in: ownerIds } }).select("email").lean()
    : [];
  const emailByOwner = new Map(owners.map((o) => [String(o._id), o.email]));
  const bizMeta = new Map(
    businesses.map((b) => [
      String(b._id),
      {
        name: b.name || "",
        ownerEmail: emailByOwner.get(String(b.ownerUserId)) || null,
      },
    ])
  );

  const planIds = [...new Set(activeSubs.map((s) => String(s.planId)))];
  const plans = planIds.length
    ? await ProductPlanModel.find({ _id: { $in: planIds } }).lean()
    : [];
  const planById = new Map(plans.map((p) => [String(p._id), p]));
  const planByBusiness = new Map<string, { name: string; price: number; currency: string }>();
  for (const sub of activeSubs) {
    const bid = String(sub.businessId);
    if (planByBusiness.has(bid)) continue;
    const plan = planById.get(String(sub.planId));
    if (plan) {
      planByBusiness.set(bid, {
        name: plan.name,
        price: plan.price,
        currency: (plan.currency || "INR").toUpperCase(),
      });
    }
  }

  const byBusiness: UsageBusinessRow[] = businessIds
    .map((businessId) => {
      const agg = byBusinessMap.get(businessId)!;
      const meta = bizMeta.get(businessId);
      const plan = planByBusiness.get(businessId);
      const revList = moneyMapToList(agg.revenueByCurrency);
      const revInr = round2(
        revList.reduce((sum, r) => sum + toInr(r.amount, r.currency, usdToInrRate), 0)
      );
      const costInr = round2(agg.estimatedCostUsd * usdToInrRate);
      return {
        businessId,
        businessName: meta?.name || "Unknown",
        ownerEmail: meta?.ownerEmail || null,
        planName: plan?.name || null,
        planPrice: plan?.price ?? null,
        planCurrency: plan?.currency || null,
        calls: agg.calls,
        inputTokens: agg.inputTokens,
        outputTokens: agg.outputTokens,
        estimatedCostUsd: round4(agg.estimatedCostUsd),
        estimatedCostInr: costInr,
        revenueByCurrency: revList,
        revenueInr: revInr,
        marginInr: round2(revInr - costInr),
      };
    })
    .sort((a, b) => b.estimatedCostUsd - a.estimatedCostUsd || b.revenueInr - a.revenueInr);

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    costCurrency: "USD",
    reportingCurrency: "INR",
    fx: { usdToInrRate },
    totals: {
      calls,
      inputTokens,
      outputTokens,
      estimatedCostUsd: round4(estimatedCostUsd),
      estimatedCostInr,
      revenueByCurrency,
      revenueInr,
      marginInr,
    },
    byFeature: [...byFeatureMap.values()].map((r) => ({
      ...r,
      estimatedCost: round4(r.estimatedCost),
    })),
    byModel: [...byModelMap.values()].map((r) => ({
      ...r,
      estimatedCost: round4(r.estimatedCost),
    })),
    byDay: [...byDayMap.values()]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((r) => ({ ...r, estimatedCost: round4(r.estimatedCost) })),
    byBusiness,
    costRates: rates,
  };
}

export async function getBusinessUsageForUser(userId: string, days = 30) {
  const { BusinessModel } = await import("../models/Business");
  const business = await BusinessModel.findOne({ ownerUserId: userId }).lean();
  if (!business) throw new AppError("Business not found", 404);

  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - days * 24 * 60 * 60 * 1000);
  const rates = await listCostRates();
  const rateByModel = new Map(rates.map((r) => [r.model, r]));

  const events = await UsageEventModel.find({
    businessId: business._id,
    createdAt: { $gte: periodStart, $lte: periodEnd },
  })
    .select("feature model inputTokens outputTokens estimatedCost")
    .lean();

  let calls = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let estimatedCost = 0;
  const byFeatureMap = new Map<string, UsageSummaryRow>();

  for (const ev of events) {
    const inTok = ev.inputTokens || 0;
    const outTok = ev.outputTokens || 0;
    const cost = eventCost(ev, rateByModel);
    calls += 1;
    inputTokens += inTok;
    outputTokens += outTok;
    estimatedCost += cost;
    const key = ev.feature || "unknown";
    const row = byFeatureMap.get(key) || { key, inputTokens: 0, outputTokens: 0, calls: 0, estimatedCost: 0 };
    row.inputTokens += inTok;
    row.outputTokens += outTok;
    row.calls += 1;
    row.estimatedCost += cost;
    byFeatureMap.set(key, row);
  }

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    costCurrency: "USD" as const,
    totals: {
      calls,
      inputTokens,
      outputTokens,
      estimatedCost: round4(estimatedCost),
    },
    byFeature: [...byFeatureMap.values()].map((r) => ({
      ...r,
      estimatedCost: round4(r.estimatedCost),
    })),
  };
}
