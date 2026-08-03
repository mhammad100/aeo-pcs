import type { SocialLink } from "@aeo-pcs/shared";
import { callClaude } from "./claude";
import { safeParseJSON } from "../utils/llm";

export type WebEnrichment = {
  description: string;
  services: string[];
  sources: string[];
};

type WebEnrichmentRaw = {
  description?: string;
  services?: string[];
  sources?: string[];
};

function uniqueUrls(input: {
  websiteUrl?: string;
  googleBusinessUrl?: string;
  socialLinks?: SocialLink[];
}): string[] {
  const urls: string[] = [];
  if (input.websiteUrl?.trim()) urls.push(input.websiteUrl.trim());
  if (input.googleBusinessUrl?.trim()) urls.push(input.googleBusinessUrl.trim());
  for (const link of input.socialLinks || []) {
    if (link.url?.trim()) urls.push(link.url.trim());
  }
  return [...new Set(urls)].slice(0, 5);
}

export async function enrichBusinessFromWeb(input: {
  name: string;
  city: string;
  country: string;
  websiteUrl?: string;
  googleBusinessUrl?: string;
  socialLinks?: SocialLink[];
  usage?: { userId?: string | null; businessId?: string | null };
}): Promise<WebEnrichment | null> {
  const urls = uniqueUrls(input);
  if (!urls.length) return null;

  const system = `You research businesses using web search. Visit the URLs provided and extract factual information about the business.

Return ONLY a JSON object (no markdown fences) with:
- description: 1-3 sentence summary of what the business does (string)
- services: array of up to 8 key services, products, or offerings mentioned online (strings)
- sources: array of URLs you actually used (strings)

If a URL cannot be read, skip it. Do not invent services not found on the pages.`;

  const userMsg = [
    `Business name: "${input.name}"`,
    `Location context: ${input.city}, ${input.country}`,
    "URLs to research:",
    ...urls.map((url, i) => `${i + 1}. ${url}`),
  ].join("\n");

  try {
    const { text } = await callClaude({
      prompt: userMsg,
      system,
      useWebSearch: true,
      usage: {
        userId: input.usage?.userId,
        businessId: input.usage?.businessId,
        feature: "business_web_enrichment",
      },
    });

    const parsed = safeParseJSON<WebEnrichmentRaw>(text);
    if (!parsed || typeof parsed !== "object") return null;

    const description = String(parsed.description || "").trim();
    const services = (parsed.services || []).map((s) => String(s).trim()).filter(Boolean).slice(0, 8);
    const sources = (parsed.sources || urls).map((s) => String(s).trim()).filter(Boolean).slice(0, 5);

    if (!description && !services.length) return null;

    return { description, services, sources };
  } catch (err) {
    console.warn("Web enrichment failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

export function formatWebEnrichment(enrichment: WebEnrichment): string {
  const parts: string[] = [];
  if (enrichment.description) parts.push(enrichment.description);
  if (enrichment.services.length) {
    parts.push(`Services/products found online: ${enrichment.services.join("; ")}`);
  }
  return parts.join(" ");
}
