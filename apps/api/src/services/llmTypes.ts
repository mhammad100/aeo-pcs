import type { Source } from "@aeo-pcs/shared";

export type LlmCallResult = {
  text: string;
  sources: Source[];
  inputTokens: number;
  outputTokens: number;
  model: string;
};

export type LlmUsageContext = {
  userId?: string | null;
  businessId?: string | null;
  feature: string;
  refs?: Record<string, unknown>;
};

export type LlmPricing = {
  inputPer1MTokens: number;
  outputPer1MTokens: number;
  currency?: string;
};

export function sourceFromUrl(url: string, title?: string): Source | null {
  try {
    const domain = new URL(url).hostname.replace(/^www\./, "");
    return { domain, url, title: title || domain };
  } catch {
    return null;
  }
}
