import type {
  ActionPlan,
  AutomatableItem,
  BusinessCandidate,
  GeoLocation,
  ManualItem,
  PresenceAudit,
  PromptResult,
  SocialLink,
  VisibilityScore,
} from "@aeo-pcs/shared";
import {
  formatGeoLocation,
  headquartersLocation,
  normalizeGeoLocationList,
  resolvePromptLocations,
} from "@aeo-pcs/shared";
import { callClaude } from "./claude";
import {
  buildPresenceAudit,
  buildPresenceManualItems,
  filterConflictingManualItems,
} from "./presenceAudit";
import { dedupeSources, NO_MARKDOWN_RULE, safeParseJSON } from "../utils/llm";

function formatAuditForPrompt(audit: PresenceAudit): string {
  const lines = [
    "Verified online presence (do not contradict these facts):",
    `- Google Business Profile: ${audit.googleBusiness.status}${audit.googleBusiness.url ? ` (${audit.googleBusiness.url})` : ""}. ${audit.googleBusiness.summary}`,
    `- Website: ${audit.website.status}${audit.website.url ? ` (${audit.website.url})` : ""}. ${audit.website.summary}`,
  ];

  if (audit.social.length) {
    for (const s of audit.social) {
      lines.push(`- ${s.label}: ${s.status}. ${s.summary}`);
    }
  } else {
    lines.push("- Social profiles: not provided in profile.");
  }

  if (audit.directories.length) {
    lines.push(
      `- Directories cited by AI: ${audit.directories.map((d) => `${d.domain} (${d.citationCount})`).join(", ")}`
    );
  }

  if (audit.topCompetitors.length) {
    lines.push(`- Businesses AI named instead: ${audit.topCompetitors.join(", ")}`);
  }

  return lines.join("\n");
}

function mergeManualItems(presenceItems: ManualItem[], llmItems: ManualItem[]): ManualItem[] {
  const seen = new Set<string>();
  const merged: ManualItem[] = [];

  for (const item of [...presenceItems, ...llmItems]) {
    const key = item.title.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }

  return merged.slice(0, 8);
}

function resolvePlanTargetLabels(input: {
  city: string;
  state?: string;
  country: string;
  targetLocations?: GeoLocation[] | unknown;
}): string[] {
  const hq = headquartersLocation({
    city: input.city,
    state: input.state,
    country: input.country,
  });
  return resolvePromptLocations(hq, normalizeGeoLocationList(input.targetLocations, hq, 15));
}

export async function buildActionPlan(input: {
  business: BusinessCandidate;
  category: string;
  city: string;
  state?: string;
  country: string;
  targetLocations?: GeoLocation[] | unknown;
  websiteUrl?: string;
  googleBusinessUrl?: string;
  socialLinks?: SocialLink[];
  results: PromptResult[];
  score?: VisibilityScore | null;
  usage?: { userId?: string | null; businessId?: string | null; refs?: Record<string, unknown> };
}): Promise<ActionPlan> {
  const targetLabels = resolvePlanTargetLabels(input);
  const targetMarketsLine = targetLabels.join(" | ") || formatGeoLocation({
    city: input.city,
    state: input.state || "",
    country: input.country,
  });

  const presenceAudit = await buildPresenceAudit({
    business: {
      name: input.business.name,
      nameAliases: input.business.nameAliases,
      websiteUrl: input.websiteUrl,
      googleBusinessUrl: input.googleBusinessUrl,
    },
    results: input.results,
    score: input.score,
    websiteUrl: input.websiteUrl,
    googleBusinessUrl: input.googleBusinessUrl,
    socialLinks: input.socialLinks,
  });

  const presenceManual = buildPresenceManualItems(presenceAudit, { targetMarkets: targetMarketsLine });

  const allSourceDomains = dedupeSources(
    input.results.flatMap((r) => r.perModel.flatMap((m) => m.sources))
  )
    .slice(0, 12)
    .map((s) => s.domain)
    .join(", ");

  const competitorContext = input.results
    .map(
      (r) =>
        `Prompt: ${r.prompt}\n` +
        r.perModel
          .map(
            (m) =>
              `${m.model}: ${m.mentioned ? "mentioned" : "not mentioned"}${m.sourceMentioned ? ", source cited" : ""}\n${m.answer.slice(0, 600)}`
          )
          .join("\n")
    )
    .join("\n\n");

  const auditBlock = formatAuditForPrompt(presenceAudit);

  const system = `You are an AI visibility consultant. You will receive a verified online presence audit and visibility check results. Your job is to recommend content and actions that improve how AI assistants mention and cite this business in their target markets.

Hard rules — never break these:
- If the audit shows Google Business Profile is on file (verified or needs_improvement), never suggest creating, claiming, or registering a new Google Business Profile.
- If the audit shows a website is on file, never suggest building or launching a new website from scratch.
- Do not repeat manual tasks already listed in the presence audit section unless you add distinct new detail.
- Circle every recommendation around the Target markets listed in the user message. Prefer location pages, local directories, local press, reviews, FAQs, and content for those markets — not only the registered business address.
- When target markets are broader (country or state only) or more specific (city), match the geographic depth of the recommendation to each market.
- Focus on citation gaps, competitor visibility, content opportunities, reviews, directories, and forum or local press presence in those markets.

Treat directories, review sites, marketplaces, and social platforms as citation sources to get listed on — NOT as business competitors. Manual items should focus on real visibility gaps: business listings, reviews, editorial features, owned website, and forum presence.

Produce ONLY a JSON object with two arrays: automatable and manual.
- Each automatable item: id (short slug), title (five words max), description (one plain sentence that names or implies the relevant target market when useful). Include 3 to 5 items such as FAQ content, a comparison paragraph, structured data guidance, forum-ready answers, or profile copy where appropriate.
- Each manual item: title (five words max), guidance (two to three plain sentences, no markdown). Include 2 to 4 items that complement—not duplicate—the verified presence findings. Prioritize directories cited in AI answers, review generation, and content distribution for the target markets.

Return valid JSON only, no markdown fences, no extra text.`;

  const identityBits = [
    `Business: ${input.business.name}`,
    `Category: ${input.category}`,
    `Registered address: ${[input.city, input.state, input.country].filter(Boolean).join(", ")}`,
    `Target markets: ${targetMarketsLine}`,
    input.business.address ? `Address: ${input.business.address}` : "",
    input.websiteUrl ? `Website: ${input.websiteUrl}` : "",
    input.googleBusinessUrl ? `Google Business Profile: ${input.googleBusinessUrl}` : "",
    input.business.description ? `Description: ${input.business.description}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const userMsg = `${identityBits}\n\n${auditBlock}\n\nDomains cited by AI models: ${allSourceDomains || "none captured"}\n\nVisibility check excerpts:\n${competitorContext}`;

  const { text } = await callClaude({
    prompt: userMsg,
    system,
    useWebSearch: false,
    maxTokens: 2000,
    usage: input.usage
      ? { ...input.usage, feature: "plan", refs: input.usage.refs }
      : undefined,
  });

  const parsed = safeParseJSON<{ automatable?: AutomatableItem[]; manual?: ManualItem[] }>(text);

  if (!parsed?.automatable?.length) {
    throw new Error("Couldn't build the action plan, try again.");
  }

  const llmManual = filterConflictingManualItems(parsed.manual || [], presenceAudit);
  const manual = mergeManualItems(presenceManual, llmManual);

  return {
    automatable: parsed.automatable,
    manual,
    presenceAudit,
  };
}

export async function generateItemContent(input: {
  business: BusinessCandidate;
  category: string;
  city: string;
  state?: string;
  country: string;
  targetLocations?: GeoLocation[] | unknown;
  item: Pick<AutomatableItem, "title" | "description">;
  usage?: { userId?: string | null; businessId?: string | null; refs?: Record<string, unknown> };
}): Promise<string> {
  const targetLabels = resolvePlanTargetLabels(input);
  const targetMarketsLine = targetLabels.join(" | ") || [input.city, input.state, input.country].filter(Boolean).join(", ");

  const system = `You are a GEO content writer producing one specific piece of ready-to-publish content for a small business, so an AI assistant is more likely to cite them in their target markets. Anchor the writing to the Target markets provided (country, state, and/or city as listed) — do not default to the registered address alone when targets differ. ${NO_MARKDOWN_RULE} Keep the output focused and directly usable, roughly 120 to 220 words unless the task clearly needs more.`;
  const userMsg = `Business: ${input.business.name}, ${input.category}
Registered address: ${[input.city, input.state, input.country].filter(Boolean).join(", ")}
Target markets: ${targetMarketsLine}
Description: ${input.business.description || ""}

Task: ${input.item.title}
Detail: ${input.item.description}

Write the actual content now, ready to copy and publish. Explicitly reflect the target markets where natural.`;
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
