import type { PromptResult, VisibilityScore } from "./types";
import {
  filterLocalBusinesses,
  isCoreVisibilityPrompt,
  type PromptContext,
} from "./brandFilters";
import type { PromptRunFeedback } from "./promptGeneration";

export type ModelBreakdown = {
  model: string;
  mentions: number;
  total: number;
  pct: number;
};

export type PromptBreakdown = {
  prompt: string;
  mentions: number;
  total: number;
};

export type NamedCount = {
  name: string;
  count: number;
};

export type CoreVisibilityScore = {
  visibilityPct: number;
  totalMentions: number;
  totalChecks: number;
  promptCount: number;
};

export type VisibilityRunInsights = {
  score: VisibilityScore;
  coreScore: CoreVisibilityScore | null;
  modelBreakdown: ModelBreakdown[];
  /** Every prompt from the run, in run order. */
  allPrompts: PromptBreakdown[];
  weakPrompts: PromptBreakdown[];
  strongPrompts: PromptBreakdown[];
  topCompetitors: NamedCount[];
  topSourceDomains: NamedCount[];
  sentimentLabel: "Positive" | "Neutral" | "Mixed" | "Negative" | null;
  summaryLine: string;
};

function sentimentLabelFromScore(score: number | null): VisibilityRunInsights["sentimentLabel"] {
  if (score == null) return null;
  if (score >= 75) return "Positive";
  if (score >= 60) return "Neutral";
  if (score >= 40) return "Mixed";
  return "Negative";
}

/** Extract weak prompts and top competitors from a prior visibility run for prompt regeneration. */
export function extractPromptRunFeedback(
  results: PromptResult[],
  ownNames: string[] = [],
): PromptRunFeedback {
  const weakPrompts: string[] = [];
  const competitorCounts = new Map<string, number>();

  for (const r of results) {
    let promptMentions = 0;
    let promptTotal = 0;

    for (const m of r.perModel) {
      if (!m.answer?.trim()) continue;
      promptTotal += 1;
      if (m.mentioned) promptMentions += 1;

      const citedDomains = m.sources.map((s) => (s.domain || "").trim()).filter(Boolean);
      const brands = filterLocalBusinesses(
        (m.brandsMentioned || []).map((b) => String(b ?? "")),
        citedDomains,
        ownNames.map((n) => String(n ?? "")),
      );
      for (const brand of brands) {
        competitorCounts.set(brand, (competitorCounts.get(brand) || 0) + 1);
      }
    }

    if (promptTotal > 0 && promptMentions === 0) {
      weakPrompts.push(r.prompt);
    }
  }

  const competitors = [...competitorCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name]) => name);

  return { weakPrompts: weakPrompts.slice(0, 5), competitors };
}

function computeCoreScore(
  results: PromptResult[],
  ctx: PromptContext
): CoreVisibilityScore | null {
  const coreResults = results.filter((r) => isCoreVisibilityPrompt(r.prompt, ctx));
  if (!coreResults.length) return null;

  let totalChecks = 0;
  let totalMentions = 0;

  for (const r of coreResults) {
    for (const m of r.perModel) {
      if (!m.answer?.trim()) continue;
      totalChecks += 1;
      if (m.mentioned) totalMentions += 1;
    }
  }

  if (!totalChecks) return null;

  return {
    visibilityPct: Math.round((totalMentions / totalChecks) * 100),
    totalMentions,
    totalChecks,
    promptCount: coreResults.length,
  };
}

export function computeVisibilityRunInsights(
  results: PromptResult[],
  score: VisibilityScore,
  ownNames: string[] = [],
  promptContext?: PromptContext
): VisibilityRunInsights {
  const modelStats = new Map<string, { mentions: number; total: number }>();
  const competitorCounts = new Map<string, number>();
  const domainCounts = new Map<string, number>();
  const promptStats: PromptBreakdown[] = [];
  const businessName = ownNames[0]?.trim() || "";

  for (const r of results) {
    let promptMentions = 0;
    let promptTotal = 0;

    for (const m of r.perModel) {
      if (!m.answer?.trim()) continue;
      promptTotal += 1;

      const citedDomains = m.sources.map((s) => (s.domain || "").trim()).filter(Boolean);

      const stats = modelStats.get(m.model) || { mentions: 0, total: 0 };
      stats.total += 1;
      if (m.mentioned) {
        stats.mentions += 1;
        promptMentions += 1;
      }
      modelStats.set(m.model, stats);

      const brands = filterLocalBusinesses(
        (m.brandsMentioned || []).map((b) => String(b ?? "")),
        citedDomains,
        ownNames.map((n) => String(n ?? ""))
      );
      for (const brand of brands) {
        competitorCounts.set(brand, (competitorCounts.get(brand) || 0) + 1);
      }

      for (const s of m.sources) {
        const domain = (s.domain || "").trim().toLowerCase();
        if (!domain) continue;
        domainCounts.set(domain, (domainCounts.get(domain) || 0) + 1);
      }
    }

    // Always include every prompt so the UI can show the full run (even if all models failed).
    promptStats.push({ prompt: r.prompt, mentions: promptMentions, total: promptTotal });
  }

  const modelBreakdown = [...modelStats.entries()]
    .map(([model, s]) => ({
      model,
      mentions: s.mentions,
      total: s.total,
      pct: s.total ? Math.round((s.mentions / s.total) * 100) : 0,
    }))
    .sort((a, b) => b.pct - a.pct);

  const allPrompts = [...promptStats];
  // Partition every prompt into exactly one section (no caps, no overlap) so UI totals match the run.
  const weakPrompts = promptStats
    .filter((p) => p.mentions === 0)
    .sort((a, b) => b.total - a.total);
  const strongPrompts = promptStats
    .filter((p) => p.mentions > 0)
    .sort((a, b) => b.mentions / Math.max(b.total, 1) - a.mentions / Math.max(a.total, 1));

  const topCompetitors = [...competitorCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const topSourceDomains = [...domainCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const brandPct = score.brandVisibilityPct ?? score.visibilityPct;
  const name = businessName?.trim() || "Your business";
  const coreScore = promptContext ? computeCoreScore(results, promptContext) : null;

  let summaryLine: string;
  if (brandPct >= 50) {
    summaryLine = `${name} shows up in most AI recommendations for your key searches.`;
  } else if (brandPct >= 25) {
    summaryLine = `${name} appears in some AI answers, but other local businesses are mentioned more often.`;
  } else if (coreScore && coreScore.visibilityPct > brandPct) {
    summaryLine = `${name} has stronger visibility on niche searches (${coreScore.visibilityPct}% on ${coreScore.promptCount} core prompts) but is missing from broader queries.`;
  } else {
    summaryLine = `AI assistants rarely mention ${name} for the searches we tested.`;
  }

  return {
    score,
    coreScore,
    modelBreakdown,
    allPrompts,
    weakPrompts,
    strongPrompts,
    topCompetitors,
    topSourceDomains,
    sentimentLabel: sentimentLabelFromScore(score.sentimentScore),
    summaryLine,
  };
}
