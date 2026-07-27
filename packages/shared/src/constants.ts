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

/** Display labels — backend simulates each style via Claude system prompts. */
export const MODELS = ["ChatGPT-style", "Gemini-style", "Perplexity-style"] as const;

export type ModelLabel = (typeof MODELS)[number];
