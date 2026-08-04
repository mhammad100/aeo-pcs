import { CATEGORIES, type Category } from "./constants";
import type { GeoLocation } from "./geo";
import { formatGeoLocation } from "./geo";
import { isCoreVisibilityPrompt, type PromptContext } from "./brandFilters";

/** Minimum share of prompts that must be niche/core (not generic category-only). */
export const MIN_CORE_PROMPT_RATIO = 0.6;

/** Weight multiplier for core prompts in composite visibility scoring. */
export const CORE_PROMPT_SCORE_WEIGHT = 2;

const DEICTIC_PATTERN =
  /\b(this|that|the)\s+(restaurant|cafe|café|coffee shop|place|business|company|shop|store|clinic|hospital|hotel|salon|spa|institute|firm|builder|supplier|property)\b/i;

const DISCOVERY_PATTERN =
  /\b(where can i|where do i|where to|where is|who (offers|provides|should|can)|what are|which|are there|is there|can i find|looking for|recommend|suggest|best|top|good|any|near me|nearby|i need|help me find|who can|open late|delivery|in \w+)/i;

const CATEGORY_HINTS: Record<Category, string> = {
  "Restaurant / Food & Beverage":
    "Discovery angles: cuisine or dietary needs, ambience or vibe, neighborhood, hours, signature food/drink themes — not every menu SKU.",
  "Retail / Fashion & Apparel":
    "Discovery angles: product type, style, price segment, occasion, shopping area or mall proximity.",
  "Ayurveda / Wellness & Clinic":
    "Discovery angles: treatment or therapy type, specialization, appointments, wellness goals, locality.",
  "Manufacturer / Industrial Supplier":
    "Discovery angles: product or material, capacity, B2B supply, industry use-case, service region. B2B and vendor-selection prompts are appropriate.",
  "Real Estate / Builder":
    "Discovery angles: property type, budget band, locality, amenities, new vs resale, builder reputation.",
  "Education / Coaching Institute":
    "Discovery angles: exam or course, subject, mode (online/offline), batch timing, results track record, area.",
  "Salon / Spa / Beauty":
    "Discovery angles: service type, gender, premium vs budget, bridal/event packages, neighborhood.",
  "Hospital / Healthcare":
    "Discovery angles: specialty, doctor type, emergency vs planned care, insurance, locality.",
  "Hotel / Hospitality":
    "Discovery angles: stay type, budget, amenities, events or dining, airport or business district proximity.",
  "IT / Software Services":
    "Discovery angles: service type (web, ERP, mobile), industry, local vs remote, project size. B2B hire/vendor prompts are appropriate.",
  Jewellery:
    "Discovery angles: occasion, material, custom design, budget, trusted local jeweller area.",
  "Automobile / Auto Parts":
    "Discovery angles: vehicle type, parts vs service, brand specialization, locality, warranty.",
  Other:
    "Discovery angles: core services, differentiators, ideal customer need, service area — adapt to the description.",
};

/** Resolved category label for prompts, display, and LLM context. */
export function getEffectiveCategory(category: string, customCategory?: string): string {
  if (normalizeCategory(category) === "Other" && customCategory?.trim()) {
    return customCategory.trim();
  }
  return category.trim() || "Other";
}

/** Human-readable category for UI. */
export function formatCategoryLabel(category: string, customCategory?: string): string {
  if (normalizeCategory(category) === "Other" && customCategory?.trim()) {
    return customCategory.trim();
  }
  return category.trim() || "Other";
}

/** Map partial/legacy category labels to canonical CATEGORIES values. */
export function normalizeCategory(category: string): Category {
  const trimmed = category.trim();
  if ((CATEGORIES as readonly string[]).includes(trimmed)) {
    return trimmed as Category;
  }
  const lower = trimmed.toLowerCase();
  const match = CATEGORIES.find(
    (c) =>
      c.toLowerCase() === lower ||
      c.toLowerCase().startsWith(lower) ||
      lower.startsWith(c.toLowerCase().split("/")[0]!.trim())
  );
  return match ?? "Other";
}

export function getCategoryPromptHint(category: string, customCategory?: string): string {
  const normalized = normalizeCategory(category);
  if (normalized === "Other" && customCategory?.trim()) {
    return `Discovery angles for a ${customCategory.trim()} business: core services, differentiators, ideal customer need, service area — adapt to the description.`;
  }
  return CATEGORY_HINTS[normalized];
}

export function isB2BCategory(category: string): boolean {
  const normalized = normalizeCategory(category);
  return (
    normalized === "Manufacturer / Industrial Supplier" ||
    normalized === "IT / Software Services" ||
    normalized === "Real Estate / Builder"
  );
}

/** Cap granular target items so prompts stay thematic, not one SKU per question. */
export function summarizeTargetItems(items: string[], maxThemes = 5): string {
  const trimmed = items.map((i) => i.trim()).filter(Boolean);
  if (!trimmed.length) return "";
  if (trimmed.length <= maxThemes) {
    return trimmed.join("; ");
  }
  const head = trimmed.slice(0, maxThemes).join("; ");
  return `${head}. Use these as themes across prompts — do not create one question per menu item or SKU.`;
}

export type PromptValidationResult = {
  valid: boolean;
  reason?: string;
};

export function validateVisibilityPrompt(prompt: string): PromptValidationResult {
  const text = prompt.trim();
  if (!text) return { valid: false, reason: "empty" };
  if (text.length < 12) return { valid: false, reason: "too short" };
  if (DEICTIC_PATTERN.test(text)) {
    return { valid: false, reason: "uses deictic reference (this/that/the + business type)" };
  }
  if (!DISCOVERY_PATTERN.test(text)) {
    return { valid: false, reason: "not discovery-style phrasing" };
  }
  return { valid: true };
}

export function filterValidVisibilityPrompts(prompts: string[]): string[] {
  return prompts.filter((p) => validateVisibilityPrompt(p).valid);
}

export function countCoreVisibilityPrompts(prompts: string[], ctx: PromptContext): number {
  return prompts.filter((p) => isCoreVisibilityPrompt(p, ctx)).length;
}

/** Prefer niche/core prompts; fill remainder with other valid discovery prompts. */
export function selectPromptsForRun(
  candidates: string[],
  count: number,
  ctx: PromptContext,
): string[] {
  const valid = filterValidVisibilityPrompts(candidates);
  const seen = new Set<string>();
  const core: string[] = [];
  const other: string[] = [];

  for (const p of valid) {
    const key = p.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (isCoreVisibilityPrompt(p, ctx)) core.push(p);
    else other.push(p);
  }

  const selected: string[] = [];

  for (const p of core) {
    if (selected.length >= count) break;
    selected.push(p);
  }
  for (const p of other) {
    if (selected.length >= count) break;
    if (!selected.includes(p)) selected.push(p);
  }
  for (const p of valid) {
    if (selected.length >= count) break;
    if (!selected.includes(p)) selected.push(p);
  }

  return selected.slice(0, count);
}

export function meetsCorePromptQuota(prompts: string[], count: number, ctx: PromptContext): boolean {
  if (!prompts.length) return false;
  const minCore = Math.max(1, Math.ceil(count * MIN_CORE_PROMPT_RATIO));
  return countCoreVisibilityPrompts(prompts, ctx) >= minCore;
}

export type PromptRunFeedback = {
  weakPrompts: string[];
  competitors: string[];
};

export type BuildPromptSystemInput = {
  count: number;
  category: string;
  customCategory?: string;
  headquarters: GeoLocation;
  promptLocations: string[];
  targetItemsSummary: string;
  webContext?: string;
  priorFeedback?: PromptRunFeedback;
};

export function buildVisibilityPromptSystem(input: BuildPromptSystemInput): string {
  const effectiveCategory = getEffectiveCategory(input.category, input.customCategory);
  const categoryHint = getCategoryPromptHint(input.category, input.customCategory);
  const b2b = isB2BCategory(input.category);
  const locationHint = input.promptLocations.join("; ");
  const headquartersLabel = formatGeoLocation(input.headquarters);

  const hqNote =
    headquartersLabel &&
    !input.promptLocations.some(
      (loc) => loc.toLowerCase() === headquartersLabel.toLowerCase(),
    )
      ? `- The business is registered in ${headquartersLabel} but does NOT serve there — NEVER mention that address in questions`
      : "";

  const locationRules =
    input.promptLocations.length > 1
      ? `- Service areas (use ONLY these — never invent other cities): ${locationHint}
- Spread explicit/neighborhood prompts across different areas; include at least one prompt per area when count allows
- Location mix across all ${input.count} questions (realistic AI usage — assistants often know user location):
  * ~35% explicit area ("Best X in [neighborhood/city]")
  * ~30% "near me" or "nearby" (no city name in the question)
  * ~20% neighborhood or landmark style within service areas
  * ~15% need-only (no location words — specialty/offering focused; geo is inferred by the AI)`
      : input.promptLocations.length === 1
        ? `- Primary service area: "${input.promptLocations[0]}"
- Location mix: combine explicit area references, "near me"/"nearby", and need-only questions without city names
- Do NOT invent other cities or countries`
        : `- Use "${headquartersLabel || input.headquarters.country}" for explicit-area questions only
- Also include "near me" and need-only questions without invented cities`;

  const intentRules = `- Mix intent types across all prompts:
  * Discovery ("Where can I find…")
  * Recommendation ("Best X for [occasion/need]")
  * Constraint ("open late", "delivery", "walk-in", "budget-friendly")
  * Problem-solution ("I need X that does Y", "Who can help with…")
- At least ${Math.ceil(input.count * MIN_CORE_PROMPT_RATIO)} of ${input.count} questions MUST reference a specific offering theme or distinct business trait — NOT generic "best [category] in [city]" alone`;

  const feedbackRule = input.priorFeedback?.weakPrompts.length
    ? `- Prior run had weak visibility on these prompts — generate DIFFERENT angles (same intent, new wording/offerings), do NOT copy them verbatim: ${input.priorFeedback.weakPrompts.slice(0, 3).join(" | ")}`
    : "";

  const competitorRule = input.priorFeedback?.competitors.length
    ? `- AI often named these competitors instead — craft prompts where this business could compete on niche strengths: ${input.priorFeedback.competitors.slice(0, 5).join(", ")}`
    : "";

  const offeringRule = input.targetItemsSummary
    ? `- Reflect these offering themes across prompts (2-3 themes total, not one question per item): ${input.targetItemsSummary}`
    : `- Match category "${effectiveCategory}" using traits from the business description`;

  const webRule = input.webContext
    ? `- Verified online presence (prefer over empty profile fields): ${input.webContext}`
    : "";

  const b2bRule = b2b
    ? "- B2B, vendor-selection, and \"who should I hire / who supplies\" prompts are appropriate for this category"
    : "- Use consumer discovery prompts — not B2B procurement unless the description clearly targets business buyers";

  return `You generate realistic buyer-intent questions that potential customers would type into an AI assistant when looking for a business like the one described — never naming the business itself.

Each question is sent alone to an AI with no prior context. The customer does not know this business yet. Real users often ask "near me" or omit location because the AI already knows where they are.

Universal rules:
- Return ONLY a JSON array of exactly ${input.count} short question strings
- NEVER use deictic phrasing: no "this restaurant", "this cafe", "this place", "this company", "the restaurant", etc.
- ALWAYS use discovery phrasing: "Where can I…", "Are there any…", "Who offers…", "Best … in [area]", "Which … near me", "I need…", etc.
- Questions must help someone DISCOVER businesses — not ask about an unnamed "this" business
- Reflect what makes THIS business distinct (description + offerings), not generic category-only searches
${hqNote}
${locationRules}
${intentRules}
${offeringRule}
${webRule}
${feedbackRule}
${competitorRule}
${b2bRule}
- Category guidance: ${categoryHint}
- No markdown, no prose outside the JSON array`;
}

export function buildVisibilityPromptUserMessage(input: {
  businessName: string;
  category: string;
  customCategory?: string;
  headquarters: GeoLocation;
  promptLocations: string[];
  targetItemsSummary: string;
  description: string;
  webContext?: string;
  priorFeedback?: PromptRunFeedback;
}): string {
  const headquartersLabel = formatGeoLocation(input.headquarters);
  const hqLine =
    headquartersLabel &&
    !input.promptLocations.some(
      (loc) => loc.toLowerCase() === headquartersLabel.toLowerCase(),
    )
      ? `Registered address (do NOT use in questions): ${headquartersLabel}`
      : `Headquarters: ${headquartersLabel || input.headquarters.country}`;

  return [
    `Business: ${input.businessName}`,
    `Category: ${getEffectiveCategory(input.category, input.customCategory)}`,
    hqLine,
    `Service areas for prompts (use ONLY these, each with its own country): ${input.promptLocations.join("; ") || headquartersLabel}`,
    input.targetItemsSummary
      ? `Offering themes: ${input.targetItemsSummary}`
      : `Offerings: derive from description, website, and category`,
    `What makes this business distinct: ${input.description || input.category}`,
    input.webContext ? `From website/social: ${input.webContext}` : "",
    input.priorFeedback?.weakPrompts.length
      ? `Avoid repeating these low-performing prompts from the last run: ${input.priorFeedback.weakPrompts.join(" | ")}`
      : "",
    input.priorFeedback?.competitors.length
      ? `Competitors often mentioned by AI: ${input.priorFeedback.competitors.join(", ")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}
