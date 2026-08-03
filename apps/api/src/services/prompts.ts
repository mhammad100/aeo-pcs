import type { BusinessCandidate } from "@aeo-pcs/shared";
import {
  buildVisibilityPromptSystem,
  buildVisibilityPromptUserMessage,
  filterValidVisibilityPrompts,
  summarizeTargetItems,
} from "@aeo-pcs/shared";
import { safeParseJSON } from "../utils/llm";
import { getAeoSettings } from "./aeoSettings.service";
import { callTaskModel } from "./taskModelRunner";

const MAX_GENERATION_ATTEMPTS = 3;

export async function generatePrompts(input: {
  business: BusinessCandidate;
  category: string;
  customCategory?: string;
  city: string;
  country: string;
  targetLocations?: string[];
  targetItems?: string[];
  usage?: { userId?: string | null; businessId?: string | null };
}): Promise<string[]> {
  const settings = await getAeoSettings();
  const count = settings.promptsPerRun;
  const model = settings.promptGenerationModel;

  if (model.enabled === false) {
    throw new Error("Prompt generation is disabled in admin settings");
  }

  const city = input.city.trim();
  const locations = [...new Set([city, ...(input.targetLocations || [])].filter(Boolean))];
  const neighborhoods = (input.targetLocations || []).filter(
    (loc) => loc.trim().toLowerCase() !== city.toLowerCase()
  );
  const locationHint = locations.join(", ");
  const description = (input.business.description || "").trim();
  const targetItemsSummary = summarizeTargetItems((input.targetItems || []).filter(Boolean));

  const system = buildVisibilityPromptSystem({
    count,
    category: input.category,
    customCategory: input.customCategory,
    city,
    country: input.country,
    locationHint,
    neighborhoods,
    targetItemsSummary,
  });

  const userMsg = buildVisibilityPromptUserMessage({
    businessName: input.business.name,
    category: input.category,
    customCategory: input.customCategory,
    city,
    country: input.country,
    locationHint,
    targetItemsSummary,
    description,
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
