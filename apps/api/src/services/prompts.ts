import type { BusinessCandidate } from "@aeo-pcs/shared";
import { safeParseJSON } from "../utils/llm";
import { getAeoSettings } from "./aeoSettings.service";
import { callOpenAI } from "./openai";

export async function generatePrompts(input: {
  business: BusinessCandidate;
  category: string;
  city: string;
  country: string;
  usage?: { userId?: string | null; businessId?: string | null };
}): Promise<string[]> {
  const settings = await getAeoSettings();
  const count = settings.promptsPerRun;
  const model = settings.promptGenerationModel;

  if (model.enabled === false) {
    throw new Error("Prompt generation is disabled in admin settings");
  }

  if (model.provider !== "openai") {
    throw new Error(
      `Prompt generation provider "${model.provider}" is not supported yet (expected openai)`
    );
  }

  const system = `You generate realistic buyer-intent questions that potential customers would type into an AI assistant when looking for a business like this, not naming the business itself. Return ONLY a JSON array of exactly ${count} short question strings, no markdown, no prose.`;
  const userMsg = `Business: ${input.business.name}\nCategory: ${input.category}\nCity: ${input.city}\nCountry: ${input.country}\nDescription: ${input.business.description || ""}`;

  const { text } = await callOpenAI({
    modelId: model.modelId,
    prompt: userMsg,
    system,
    usage: {
      userId: input.usage?.userId,
      businessId: input.usage?.businessId,
      feature: "prompts",
    },
    pricing: {
      inputPer1MTokens: model.inputPer1MTokens,
      outputPer1MTokens: model.outputPer1MTokens,
      currency: model.currency,
    },
  });

  const parsed = safeParseJSON<string[]>(text);

  if (!parsed || !Array.isArray(parsed) || !parsed.length) {
    throw new Error("Couldn't auto-generate prompts, try again.");
  }

  return parsed.slice(0, count).map(String);
}
