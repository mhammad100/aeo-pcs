import { CATEGORIES, type Category } from "./constants";

const DEICTIC_PATTERN =
  /\b(this|that|the)\s+(restaurant|cafe|café|coffee shop|place|business|company|shop|store|clinic|hospital|hotel|salon|spa|institute|firm|builder|supplier|property)\b/i;

const DISCOVERY_PATTERN =
  /\b(where can i|where do i|where to|where is|who (offers|provides|should|can)|what are|which|are there|is there|can i find|looking for|recommend|suggest|best|top|good|any|near me|in \w+)/i;

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

export function getCategoryPromptHint(category: string): string {
  return CATEGORY_HINTS[normalizeCategory(category)];
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

export type BuildPromptSystemInput = {
  count: number;
  category: string;
  city: string;
  country: string;
  locationHint: string;
  neighborhoods: string[];
  targetItemsSummary: string;
};

export function buildVisibilityPromptSystem(input: BuildPromptSystemInput): string {
  const category = normalizeCategory(input.category);
  const categoryHint = CATEGORY_HINTS[category];
  const b2b = isB2BCategory(input.category);

  const locationRules = input.neighborhoods.length
    ? `- At least 2 questions MUST mention one of these service areas only: ${input.neighborhoods.join(", ")} (do not invent other neighborhoods unless also listed below)`
    : `- Use "${input.city}" or "${input.country}" for location — do NOT invent sub-areas or neighborhoods not listed under service areas`;

  const offeringRule = input.targetItemsSummary
    ? `- Reflect these offering themes across prompts (2–3 themes total, not one question per item): ${input.targetItemsSummary}`
    : `- Match category "${category}" using traits from the business description`;

  const b2bRule = b2b
    ? "- B2B, vendor-selection, and \"who should I hire / who supplies\" prompts are appropriate for this category"
    : "- Use consumer discovery prompts — not B2B procurement unless the description clearly targets business buyers";

  return `You generate realistic buyer-intent questions that potential customers would type into an AI assistant when looking for a business like the one described — never naming the business itself.

Each question is sent alone to an AI with no prior context. The customer does not know this business yet.

Universal rules:
- Return ONLY a JSON array of exactly ${input.count} short question strings
- Every question MUST include a location reference (${input.locationHint}, ${input.country})
- NEVER use deictic phrasing: no "this restaurant", "this cafe", "this place", "this company", "the restaurant", etc.
- ALWAYS use discovery phrasing: "Where can I…", "Are there any…", "Who offers…", "Best … in [area]", "Which … near…", etc.
- Questions must help someone DISCOVER businesses — not ask about an unnamed "this" business
- Reflect what makes THIS business distinct (description + offerings), not generic category-only searches
${locationRules}
${offeringRule}
${b2bRule}
- Category guidance: ${categoryHint}
- Mix discovery and recommendation intents tied to this business niche
- No markdown, no prose outside the JSON array`;
}

export function buildVisibilityPromptUserMessage(input: {
  businessName: string;
  category: string;
  city: string;
  country: string;
  locationHint: string;
  targetItemsSummary: string;
  description: string;
}): string {
  return [
    `Business: ${input.businessName}`,
    `Category: ${normalizeCategory(input.category)}`,
    `Primary city: ${input.city}`,
    `Country: ${input.country}`,
    `Service areas (use ONLY these for neighborhoods): ${input.locationHint}`,
    input.targetItemsSummary
      ? `Offering themes: ${input.targetItemsSummary}`
      : `Offerings: derive from description and category`,
    `What makes this business distinct: ${input.description || input.category}`,
  ].join("\n");
}
