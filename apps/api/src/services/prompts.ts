import type { BusinessCandidate, GeoLocation, SocialLink } from "@aeo-pcs/shared";
import {
  buildVisibilityPromptSystem,
  buildVisibilityPromptUserMessage,
  filterValidVisibilityPrompts,
  headquartersLocation,
  resolvePromptLocations,
  summarizeTargetItems,
} from "@aeo-pcs/shared";
import { safeParseJSON } from "../utils/llm";
import { getAeoSettings } from "./aeoSettings.service";
import { enrichBusinessFromWeb, formatWebEnrichment } from "./businessWebEnrichment";
import { callTaskModel } from "./taskModelRunner";

const MAX_GENERATION_ATTEMPTS = 3;

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

  const system = buildVisibilityPromptSystem({
    count,
    category: input.category,
    customCategory: input.customCategory,
    headquarters,
    promptLocations,
    targetItemsSummary,
    webContext,
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
  });

  let lastInvalid: string[] = [];

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const retryNote =
      attempt > 0
        ? "\n\nYour previous output included invalid prompts (used 'this restaurant/cafe/place' or non-discovery phrasing). Regenerate ALL prompts following discovery-only rules."
        : "";

    const { text } = await callTaskModel({
      model,
      prompt: userMsg + retryNote,
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

    const candidates = parsed.slice(0, count).map(String);
    const valid = filterValidVisibilityPrompts(candidates);

    if (valid.length >= count) {
      return valid.slice(0, count);
    }

    lastInvalid = candidates;

    if (valid.length > 0 && attempt === MAX_GENERATION_ATTEMPTS - 1) {
      return valid;
    }
  }

  if (lastInvalid.length) {
    const partial = filterValidVisibilityPrompts(lastInvalid);
    if (partial.length) return partial;
  }

  throw new Error("Couldn't auto-generate valid discovery prompts, try again.");
}
