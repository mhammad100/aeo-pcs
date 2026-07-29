import type { CostRate, UsageProfitSummary, UsageSummaryRow } from "@aeo-pcs/shared";
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
  } catch {
    // Never fail the primary LLM call on logging errors
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

export async function getUsageProfitSummary(days = 30): Promise<UsageProfitSummary> {
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - days * 24 * 60 * 60 * 1000);
  const rates = await listCostRates();
  const rateByModel = new Map(rates.map((r) => [r.model, r]));

  const events = await UsageEventModel.find({
    createdAt: { $gte: periodStart, $lte: periodEnd },
  })
    .select("feature model inputTokens outputTokens estimatedCost createdAt")
    .lean();

  const byFeatureMap = new Map<string, UsageSummaryRow>();
  const byModelMap = new Map<string, UsageSummaryRow>();
  const byDayMap = new Map<string, UsageSummaryRow>();

  let calls = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let estimatedCost = 0;

  for (const ev of events) {
    const inTok = ev.inputTokens || 0;
    const outTok = ev.outputTokens || 0;
    const cost = eventCost(ev, rateByModel);
    calls += 1;
    inputTokens += inTok;
    outputTokens += outTok;
    estimatedCost += cost;

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
  }

  const paidInvoices = await InvoiceModel.find({
    status: "paid",
    createdAt: { $gte: periodStart, $lte: periodEnd },
  })
    .select("amount")
    .lean();
  const subscriptionRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

  const round2 = (n: number) => Math.round(n * 100) / 100;

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    totals: {
      calls,
      inputTokens,
      outputTokens,
      estimatedCost: round2(estimatedCost),
      subscriptionRevenue: round2(subscriptionRevenue),
      margin: round2(subscriptionRevenue - estimatedCost),
    },
    byFeature: [...byFeatureMap.values()].map((r) => ({ ...r, estimatedCost: round2(r.estimatedCost) })),
    byModel: [...byModelMap.values()].map((r) => ({ ...r, estimatedCost: round2(r.estimatedCost) })),
    byDay: [...byDayMap.values()]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((r) => ({ ...r, estimatedCost: round2(r.estimatedCost) })),
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

  const round2 = (n: number) => Math.round(n * 100) / 100;
  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    totals: {
      calls,
      inputTokens,
      outputTokens,
      estimatedCost: round2(estimatedCost),
    },
    byFeature: [...byFeatureMap.values()].map((r) => ({
      ...r,
      estimatedCost: round2(r.estimatedCost),
    })),
  };
}
