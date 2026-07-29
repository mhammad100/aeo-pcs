export const CATEGORIES = [
  "Restaurant / Food & Beverage",
  "Retail / Fashion & Apparel",
  "Ayurveda / Wellness & Clinic",
  "Manufacturer / Industrial Supplier",
  "Real Estate / Builder",
  "Education / Coaching Institute",
  "Salon / Spa / Beauty",
  "Hospital / Healthcare",
  "Hotel / Hospitality",
  "IT / Software Services",
  "Jewellery",
  "Automobile / Auto Parts",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const LLM_PROVIDERS = ["google", "openai", "perplexity", "anthropic"] as const;
export type LlmProvider = (typeof LLM_PROVIDERS)[number];

export const DEFAULT_PROMPTS_PER_RUN = 5;
export const MAX_PROMPTS_PER_RUN = 20;
