import type { BusinessCandidate, GeoLocation, PromptResult, SocialLink } from "@aeo-pcs/shared";
import {
  buildVisibilityPromptSystem,
  buildVisibilityPromptUserMessage,
  extractPromptRunFeedback,
  headquartersLocation,
  meetsCorePromptQuota,
  resolvePromptLocations,
  selectPromptsForRun,
  summarizeTargetItems,
  type PromptContext,
  type PromptRunFeedback,
} from "@aeo-pcs/shared";
import { VisibilityJobModel } from "../models/VisibilityJob";
import { safeParseJSON } from "../utils/llm";
import { getAeoSettings } from "./aeoSettings.service";
import { enrichBusinessFromWeb, formatWebEnrichment } from "./businessWebEnrichment";
import { callTaskModel } from "./taskModelRunner";

const MAX_GENERATION_ATTEMPTS = 3;

async function loadPriorRunFeedback(input: {
  businessId?: string | null;
  business: BusinessCandidate;
}): Promise<PromptRunFeedback | undefined> {
  if (!input.businessId) return undefined;

  const lastJob = await VisibilityJobModel.findOne({
    businessId: input.businessId,
    status: "completed",
  })
    .sort({ createdAt: -1 })
    .select("results business nameAliases")
    .lean();

  if (!lastJob?.results?.length) return undefined;

  const ownNames = [
    input.business.name,
    ...(input.business.nameAliases || []),
    ...(lastJob.business?.nameAliases || []).map(String),
    lastJob.business?.name ? String(lastJob.business.name) : "",
  ].filter(Boolean);

  return extractPromptRunFeedback(lastJob.results as PromptResult[], ownNames);
}

export async function generatePrompts(input: {
  business: BusinessCandidate;
  category: string;
  customCategory?: string;
  city: string;
  state?: string;
  country: string;
  countryCode?: string;
  stateCode?: string;
  targetLocations?: GeoLocation[];
  targetItems?: string[];
  websiteUrl?: string;
  googleBusinessUrl?: string;
  socialLinks?: SocialLink[];
  usage?: { userId?: string | null; businessId?: string | null };
}): Promise<string[]> {
  const settings = await getAeoSettings();
  const count = settings.promptsPerRun;
  const model = settings.promptGenerationModel;

  if (model.enabled === false) {
    throw new Error("Prompt generation is disabled in admin settings");
  }

  const headquarters = headquartersLocation({
    city: input.city,
    state: input.state,
    country: input.country,
    countryCode: input.countryCode,
    stateCode: input.stateCode,
  });
  const promptLocations = resolvePromptLocations(headquarters, input.targetLocations);
  const description = (input.business.description || "").trim();

  const enrichment = await enrichBusinessFromWeb({
    name: input.business.name,
    city: headquarters.city,
    country: headquarters.country,
    websiteUrl: input.websiteUrl,
    googleBusinessUrl: input.googleBusinessUrl,
    socialLinks: input.socialLinks,
    usage: input.usage,
  });

  const webContext = enrichment ? formatWebEnrichment(enrichment) : undefined;
  const profileItems = (input.targetItems || []).filter(Boolean);
  const webItems = enrichment?.services || [];
  const mergedItems =
    profileItems.length > 0 ? profileItems : webItems.length > 0 ? webItems : [];
  const targetItemsSummary = summarizeTargetItems(mergedItems);
  const effectiveDescription =
    description || enrichment?.description?.trim() || input.business.category || "";

  const priorFeedback = await loadPriorRunFeedback({
    businessId: input.usage?.businessId,
    business: input.business,
  });

  const promptContext: PromptContext = {
    description: effectiveDescription,
    category: input.category,
    targetItems: mergedItems,
    targetLocations: input.targetLocations?.length ? input.targetLocations : [headquarters],
    city: input.city,
  };

  const system = buildVisibilityPromptSystem({
    count,
    category: input.category,
    customCategory: input.customCategory,
    headquarters,
    promptLocations,
    targetItemsSummary,
    webContext,
    priorFeedback,
  });

  const userMsg = buildVisibilityPromptUserMessage({
    businessName: input.business.name,
    category: input.category,
    customCategory: input.customCategory,
    headquarters,
    promptLocations,
    targetItemsSummary,
    description: effectiveDescription,
    webContext,
    priorFeedback,
  });

  let lastCandidates: string[] = [];

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const retryParts: string[] = [];
    if (attempt > 0) {
      retryParts.push(
        "Your previous output included invalid or too-generic prompts. Regenerate ALL prompts following discovery-only rules and niche/offering requirements.",
      );
    }
    if (attempt > 0 && lastCandidates.length) {
      if (!meetsCorePromptQuota(lastCandidates, count, promptContext)) {
        retryParts.push(
          `At least ${Math.ceil(count * 0.6)} prompts must reference specific offerings or distinct traits — avoid generic category-only questions.`,
        );
      }
    }

    const { text } = await callTaskModel({
      model,
      prompt: userMsg + (retryParts.length ? `\n\n${retryParts.join("\n")}` : ""),
      system,
      usage: {
        userId: input.usage?.userId,
        businessId: input.usage?.businessId,
        feature: "prompts",
      },
    });

    const parsed = safeParseJSON<string[]>(text);
    if (!parsed || !Array.isArray(parsed) || !parsed.length) {
      continue;
    }

    const candidates = parsed.slice(0, count * 2).map(String);
    lastCandidates = candidates;
    const selected = selectPromptsForRun(candidates, count, promptContext);

    if (selected.length >= count && meetsCorePromptQuota(selected, count, promptContext)) {
      return selected.slice(0, count);
    }

    if (selected.length > 0 && attempt === MAX_GENERATION_ATTEMPTS - 1) {
      return selected.slice(0, count);
    }
  }

  if (lastCandidates.length) {
    const partial = selectPromptsForRun(lastCandidates, count, promptContext);
    if (partial.length) return partial;
  }

  throw new Error("Couldn't auto-generate valid discovery prompts, try again.");
}
