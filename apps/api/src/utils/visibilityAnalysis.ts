import type { MentionSentiment, Source, VisibilityScore, GeoLocation } from "@aeo-pcs/shared";
import type { PromptResult } from "@aeo-pcs/shared";
import {
  formatGeoLocation,
  headquartersLocation,
  normalizeGeoLocationList,
  resolvePromptLocations,
} from "@aeo-pcs/shared";
import { extractMentioned } from "./llm";

export type VisibilityBusinessContext = {
  name: string;
  nameAliases?: string[];
  websiteUrl?: string;
  googleBusinessUrl?: string;
};

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function collectMentionNames(ctx: VisibilityBusinessContext): string[] {
  const names = new Set<string>();
  if (ctx.name?.trim()) names.add(ctx.name.trim());
  for (const alias of ctx.nameAliases || []) {
    if (alias.trim()) names.add(alias.trim());
  }
  return [...names].sort((a, b) => b.length - a.length);
}

export function isBrandMentioned(text: string, ctx: VisibilityBusinessContext): boolean {
  const names = collectMentionNames(ctx);
  return names.some((name) => extractMentioned(text, name));
}

function domainFromUrl(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function collectOwnedDomains(ctx: VisibilityBusinessContext): string[] {
  const domains = new Set<string>();
  for (const url of [ctx.websiteUrl, ctx.googleBusinessUrl]) {
    if (!url?.trim()) continue;
    const domain = domainFromUrl(url.trim());
    if (domain) domains.add(domain);
  }
  return [...domains];
}

export function isSourceMentioned(sources: Source[], ctx: VisibilityBusinessContext): boolean {
  const owned = collectOwnedDomains(ctx);
  if (!owned.length) return false;
  return sources.some((s) => {
    const d = (s.domain || domainFromUrl(s.url) || "").toLowerCase();
    return owned.some((o) => d === o || d.endsWith(`.${o}`) || o.endsWith(`.${d}`));
  });
}

export function buildVisibilityUserPrompt(input: {
  prompt: string;
  category: string;
  city: string;
  state?: string;
  country: string;
  countryCode?: string;
  stateCode?: string;
  targetLocations?: GeoLocation[];
  targetItems?: string[];
}): string {
  const headquarters = headquartersLocation({
    city: input.city,
    state: input.state,
    country: input.country,
    countryCode: input.countryCode,
    stateCode: input.stateCode,
  });
  const targets = normalizeGeoLocationList(input.targetLocations, headquarters);
  const promptLocations = resolvePromptLocations(headquarters, targets);
  const locationLine = promptLocations.length
    ? `Location context: ${promptLocations.join("; ")}`
    : `Location context: ${formatGeoLocation(headquarters)}`;
  const items = (input.targetItems || []).filter(Boolean);
  const itemLine = items.length ? `Relevant services/products: ${items.join(", ")}` : "";
  const categoryLine = input.category ? `Category: ${input.category}` : "";

  return [input.prompt, locationLine, categoryLine, itemLine].filter(Boolean).join("\n");
}

export function normalizeVisibilityScore(
  partial: Partial<VisibilityScore> | null | undefined
): VisibilityScore | null {
  if (!partial || typeof partial.brandVisibilityPct !== "number") {
    if (partial && typeof partial.visibilityPct === "number") {
      return {
        visibilityPct: partial.visibilityPct,
        brandVisibilityPct: partial.visibilityPct,
        sourceVisibilityPct: partial.sourceVisibilityPct ?? 0,
        totalMentions: partial.totalMentions ?? 0,
        totalSourceMentions: partial.totalSourceMentions ?? 0,
        totalChecks: partial.totalChecks ?? 0,
        avgPosition: partial.avgPosition ?? null,
        sentimentScore: partial.sentimentScore ?? null,
      };
    }
    return null;
  }
  return {
    visibilityPct: partial.visibilityPct ?? partial.brandVisibilityPct,
    brandVisibilityPct: partial.brandVisibilityPct,
    sourceVisibilityPct: partial.sourceVisibilityPct ?? 0,
    totalMentions: partial.totalMentions ?? 0,
    totalSourceMentions: partial.totalSourceMentions ?? 0,
    totalChecks: partial.totalChecks ?? 0,
    avgPosition: partial.avgPosition ?? null,
    sentimentScore: partial.sentimentScore ?? null,
  };
}

export function computeScore(
  results: PromptResult[],
  _modelCount: number
): VisibilityScore {
  let totalChecks = 0;
  let totalMentions = 0;
  let totalSourceMentions = 0;
  const positions: number[] = [];
  const sentiments: number[] = [];

  for (const r of results) {
    for (const m of r.perModel) {
      if (!m.answer?.trim()) continue;
      totalChecks += 1;
      if (m.mentioned) totalMentions += 1;
      if (m.sourceMentioned) totalSourceMentions += 1;
      if (m.mentioned && typeof m.position === "number" && m.position > 0) {
        positions.push(m.position);
      }
      if (m.mentioned && m.sentiment) {
        sentiments.push(sentimentToScore(m.sentiment));
      }
    }
  }

  const brandVisibilityPct = totalChecks
    ? Math.round((totalMentions / totalChecks) * 100)
    : 0;
  const sourceVisibilityPct = totalChecks
    ? Math.round((totalSourceMentions / totalChecks) * 100)
    : 0;
  const avgPosition = positions.length
    ? Math.round((positions.reduce((a, b) => a + b, 0) / positions.length) * 10) / 10
    : null;
  const sentimentScore = sentiments.length
    ? Math.round(sentiments.reduce((a, b) => a + b, 0) / sentiments.length)
    : null;

  return {
    visibilityPct: brandVisibilityPct,
    brandVisibilityPct,
    sourceVisibilityPct,
    totalMentions,
    totalSourceMentions,
    totalChecks,
    avgPosition,
    sentimentScore,
  };
}

function sentimentToScore(s: MentionSentiment): number {
  if (s === "positive") return 85;
  if (s === "negative") return 25;
  return 55;
}

export type AnswerAnalysis = {
  brandsMentioned: string[];
  targetPosition: number | null;
  sentiment: MentionSentiment | null;
};

type ParsedEntity = {
  name?: unknown;
  type?: unknown;
};

function readLocalBusinessNames(parsed: Record<string, unknown>): string[] {
  const fromLocal = parsed.localBusinessesMentioned;
  if (Array.isArray(fromLocal) && fromLocal.length) {
    return fromLocal.map(String).filter(Boolean);
  }

  const entities = parsed.entities;
  if (Array.isArray(entities) && entities.length) {
    return entities
      .filter((entry): entry is ParsedEntity => Boolean(entry && typeof entry === "object"))
      .filter((entry) => String(entry.type || "").toLowerCase() === "local_business")
      .map((entry) => String(entry.name || "").trim())
      .filter(Boolean);
  }

  const fromLegacy = parsed.brandsMentioned;
  if (Array.isArray(fromLegacy)) {
    return fromLegacy.map(String).filter(Boolean);
  }

  return [];
}

export function parseAnswerAnalysisJson(text: string, targetNames: string[]): AnswerAnalysis {
  const fallback: AnswerAnalysis = {
    brandsMentioned: [],
    targetPosition: null,
    sentiment: null,
  };
  try {
    const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return fallback;
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    const brandsMentioned = readLocalBusinessNames(parsed);
    let targetPosition: number | null = null;
    if (typeof parsed.targetPosition === "number" && parsed.targetPosition > 0) {
      targetPosition = parsed.targetPosition;
    } else if (brandsMentioned.length && targetNames.length) {
      const lower = brandsMentioned.map((b) => b.toLowerCase());
      for (const name of targetNames) {
        const idx = lower.findIndex((b) => b.includes(name.toLowerCase()) || name.toLowerCase().includes(b));
        if (idx >= 0) {
          targetPosition = idx + 1;
          break;
        }
      }
    }
    const sentimentRaw = String(parsed.sentiment || "").toLowerCase();
    const sentiment: MentionSentiment | null =
      sentimentRaw === "positive" || sentimentRaw === "negative" || sentimentRaw === "neutral"
        ? sentimentRaw
        : null;
    return { brandsMentioned, targetPosition, sentiment };
  } catch {
    return fallback;
  }
}

export function buildMentionPattern(names: string[]): RegExp | null {
  const parts = names.map((n) => escapeRegExp(n)).filter(Boolean);
  if (!parts.length) return null;
  return new RegExp(parts.join("|"), "i");
}
