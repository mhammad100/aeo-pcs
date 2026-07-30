import type { ActionPlan, AutomatableItem, BusinessCandidate, PromptResult } from "@aeo-pcs/shared";
import { callClaude } from "./claude";
import { dedupeSources, NO_MARKDOWN_RULE, safeParseJSON } from "../utils/llm";

export async function buildActionPlan(input: {
  business: BusinessCandidate;
  category: string;
  city: string;
  country: string;
  websiteUrl?: string;
  results: PromptResult[];
  usage?: { userId?: string | null; businessId?: string | null; refs?: Record<string, unknown> };
}): Promise<ActionPlan> {
  const allSourceDomains = dedupeSources(input.results.flatMap((r) => r.perModel.flatMap((m) => m.sources)))
    .slice(0, 12)
    .map((s) => s.domain)
    .join(", ");

  const competitorContext = input.results
    .map((r) => `Prompt: ${r.prompt}\n` + r.perModel.map((m) => `${m.model}: ${m.answer}`).join("\n"))
    .join("\n\n");

  const system = `You are an AI visibility consultant with web search. Before writing the plan, search the web to verify whether "${input.business.name}" in ${input.city}, ${input.country} already has a Google Business Profile / Google Maps listing (prefer maps.google.com / Google Business results that match this business name and location${input.websiteUrl ? `, and website ${input.websiteUrl}` : ""}).

Rules for Google Business Profile in the manual list:
- If you find a matching listing: do NOT suggest claiming or creating a Google Business Profile. Instead recommend concrete improvements if needed (categories, description, photos, posts, Q&A, reviews) or skip GBP entirely if it already looks solid.
- If you find no matching listing: include claiming or creating a Google Business Profile as a manual item.
- Base that decision only on your search findings, not assumptions.

Then analyze why the business is or isn't appearing in AI assistant answers, given the domains currently getting cited and the model answers below.

Treat directories, review sites, marketplaces, and social platforms as citation sources to get listed on — NOT as business competitors. Manual items should focus on real visibility gaps: business listings, reviews, editorial features, owned website, and forum presence.

Produce ONLY a JSON object with two arrays: automatable and manual.
- Each automatable item is content or copy this tool can generate right now, with fields id (short slug), title (short action label, plain text, five words max), description (one plain sentence explaining what it produces). Include 3 to 5 items such as an FAQ content block, a comparison paragraph, a Google Business Profile description (only if a listing exists or should be created), a structured data snippet description, or short-form answer content for forums.
- Each manual item is a real-world action the business owner must do themselves, with fields title (short action label, five words max) and guidance (two to three plain sentences explaining exactly what to do and why it helps AI visibility, no markdown). Include 3 to 5 items grounded in your search and the citation gaps — for example optimizing an existing Google listing, earning reviews, getting listed on relevant directories that appeared in citations, local press, or forum presence. Do not invent a "claim Google Business Profile" action when a matching listing already exists.

Return valid JSON only, no markdown fences, no extra text.`;

  const identityBits = [
    `Business: ${input.business.name}`,
    `Category: ${input.category}`,
    `Location: ${input.city}, ${input.country}`,
    input.business.address ? `Address: ${input.business.address}` : "",
    input.websiteUrl ? `Website: ${input.websiteUrl}` : "",
    input.business.description ? `Description: ${input.business.description}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const userMsg = `${identityBits}\n\nDomains currently cited by AI models instead of this business: ${allSourceDomains || "none captured"}\n\nContext from AI answers:\n${competitorContext}`;

  const { text } = await callClaude({
    prompt: userMsg,
    system,
    useWebSearch: true,
    maxTokens: 2000,
    usage: input.usage
      ? { ...input.usage, feature: "plan", refs: input.usage.refs }
      : undefined,
  });
  const parsed = safeParseJSON<ActionPlan>(text);

  if (!parsed?.automatable || !parsed?.manual) {
    throw new Error("Couldn't build the action plan, try again.");
  }

  return parsed;
}

export async function generateItemContent(input: {
  business: BusinessCandidate;
  category: string;
  city: string;
  country: string;
  item: Pick<AutomatableItem, "title" | "description">;
  usage?: { userId?: string | null; businessId?: string | null; refs?: Record<string, unknown> };
}): Promise<string> {
  const system = `You are a GEO content writer producing one specific piece of ready-to-publish content for a small business, so an AI assistant is more likely to cite them. ${NO_MARKDOWN_RULE} Keep the output focused and directly usable, roughly 120 to 220 words unless the task clearly needs more.`;
  const userMsg = `Business: ${input.business.name}, ${input.category}, ${input.city}, ${input.country}\nDescription: ${input.business.description || ""}\n\nTask: ${input.item.title}\nDetail: ${input.item.description}\n\nWrite the actual content now, ready to copy and publish.`;
  const { text } = await callClaude({
    prompt: userMsg,
    system,
    useWebSearch: false,
    usage: input.usage
      ? { ...input.usage, feature: "content", refs: input.usage.refs }
      : undefined,
  });
  return text;
}
