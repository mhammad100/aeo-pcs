/** Directories, platforms, and aggregators — not local business competitors. */
const NON_COMPETITOR_NAMES = new Set([
  "justdial",
  "swiggy",
  "zomato",
  "tripadvisor",
  "yelp",
  "google",
  "google maps",
  "google business",
  "instagram",
  "facebook",
  "linkedin",
  "twitter",
  "youtube",
  "reddit",
  "quora",
  "wikipedia",
  "eazydiner",
  "magicpin",
  "hungrito",
  "fabhotels",
  "holidify",
  "wanderlog",
  "whatshot",
  "knocksense",
  "vertexaisearch",
]);

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

function domainStem(domain: string): string {
  const clean = domain.replace(/^www\./, "").toLowerCase();
  const parts = clean.split(".").filter(Boolean);
  if (parts.length >= 2 && parts[parts.length - 1]!.length <= 3) {
    return parts[parts.length - 2] || clean;
  }
  return parts[0] || clean;
}

export function isNonCompetitorBrand(name: string, citedDomains: string[] = []): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;

  const key = normalizeKey(trimmed);
  if (!key || key.length < 2) return true;

  if (NON_COMPETITOR_NAMES.has(trimmed.toLowerCase())) return true;
  if (NON_COMPETITOR_NAMES.has(key)) return true;

  for (const blocked of NON_COMPETITOR_NAMES) {
    const blockedKey = normalizeKey(blocked);
    if (blockedKey && (key === blockedKey || key.includes(blockedKey) || blockedKey.includes(key))) {
      return true;
    }
  }

  for (const domain of citedDomains) {
    const stem = domainStem(domain);
    const stemKey = normalizeKey(stem);
    if (!stemKey) continue;
    if (key === stemKey || key.includes(stemKey) || stemKey.includes(key)) {
      return true;
    }
  }

  return false;
}

export function filterBusinessBrands(
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
    if (isNonCompetitorBrand(trimmed, citedDomains)) continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }

  return out;
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
