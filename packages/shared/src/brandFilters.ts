const STOP_WORDS = new Set([
  "about",
  "after",
  "also",
  "and",
  "are",
  "best",
  "both",
  "can",
  "find",
  "for",
  "from",
  "good",
  "great",
  "have",
  "here",
  "into",
  "like",
  "make",
  "more",
  "near",
  "offers",
  "open",
  "other",
  "some",
  "that",
  "the",
  "their",
  "them",
  "they",
  "this",
  "very",
  "what",
  "when",
  "where",
  "which",
  "with",
  "would",
  "your",
]);

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Keys derived from a cited domain for matching platform/source names in answer text. */
export function citedDomainKeys(domain: string): string[] {
  const clean = domain.replace(/^www\./, "").toLowerCase();
  const parts = clean.split(".").filter(Boolean);
  const keys = new Set<string>();

  if (!parts.length) return [];

  for (let i = 0; i < parts.length - 1; i++) {
    const key = normalizeKey(parts[i]!);
    if (key.length >= 3) keys.add(key);
  }

  if (parts.length >= 2) {
    const stem = normalizeKey(parts[parts.length - 2]!);
    if (stem.length >= 3) keys.add(stem);
  }

  return [...keys];
}

export function looksLikeUrlOrDomain(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (/^https?:\/\//i.test(trimmed)) return true;
  if (/^www\./i.test(trimmed)) return true;
  if (/^[a-z0-9-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(trimmed)) return true;
  return false;
}

/**
 * True when a name likely refers to a citation source / platform, not a local business.
 * Uses cited domains from the same answer — no hardcoded directory list.
 */
export function isLikelySourceOrPlatform(name: string, citedDomains: string[] = []): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;

  const key = normalizeKey(trimmed);
  if (!key || key.length < 2) return true;
  if (looksLikeUrlOrDomain(trimmed)) return true;

  for (const domain of citedDomains) {
    for (const domainKey of citedDomainKeys(domain)) {
      if (key === domainKey || key.includes(domainKey) || domainKey.includes(key)) {
        return true;
      }
    }
  }

  return false;
}

/** Keep only names that look like local businesses, excluding own brand and citation sources. */
export function filterLocalBusinesses(
  brands: string[],
  citedDomains: string[] = [],
  ownNames: string[] = []
): string[] {
  const ownKeys = new Set(ownNames.map((n) => normalizeKey(n)).filter(Boolean));
  const seen = new Set<string>();
  const out: string[] = [];

  for (const brand of brands) {
    const trimmed = brand.trim();
    if (!trimmed) continue;
    const key = normalizeKey(trimmed);
    if (ownKeys.has(key)) continue;
    if (isLikelySourceOrPlatform(trimmed, citedDomains)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }

  return out;
}

/** @deprecated Use filterLocalBusinesses */
export function filterBusinessBrands(
  brands: string[],
  citedDomains: string[] = [],
  ownNames: string[] = []
): string[] {
  return filterLocalBusinesses(brands, citedDomains, ownNames);
}

/** @deprecated Use isLikelySourceOrPlatform */
export function isNonCompetitorBrand(name: string, citedDomains: string[] = []): boolean {
  return isLikelySourceOrPlatform(name, citedDomains);
}

export type PromptContext = {
  description?: string;
  category?: string;
  targetItems?: string[];
  targetLocations?: string[];
  city?: string;
};

export function extractSignificantTerms(text: string, max = 10): string[] {
  const words = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 4 && !STOP_WORDS.has(w));

  const unique: string[] = [];
  for (const w of words) {
    if (!unique.includes(w)) unique.push(w);
    if (unique.length >= max) break;
  }
  return unique;
}

/** Prompts aligned with this business's niche (not generic category-only queries). */
export function isCoreVisibilityPrompt(prompt: string, ctx: PromptContext): boolean {
  const p = prompt.toLowerCase();
  const terms: string[] = [];

  for (const item of ctx.targetItems || []) {
    if (item.trim()) terms.push(item.toLowerCase());
  }
  for (const loc of ctx.targetLocations || []) {
    if (loc.trim()) terms.push(loc.toLowerCase());
  }
  terms.push(...extractSignificantTerms(ctx.description || ""));

  if (ctx.category && ctx.category.toLowerCase() !== "other") {
    const catWords = ctx.category.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 4);
    terms.push(...catWords.slice(0, 2));
  }

  return terms.some((term) => term.length > 3 && p.includes(term));
}
