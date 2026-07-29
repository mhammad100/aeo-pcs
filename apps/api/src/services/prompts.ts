import type { BusinessCandidate } from "@aeo-pcs/shared";
import { safeParseJSON } from "../utils/llm";
import { getAeoSettings } from "./aeoSettings.service";
import { callTaskModel } from "./taskModelRunner";

export async function generatePrompts(input: {
  business: BusinessCandidate;
  category: string;
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

  const locations = [...new Set([input.city, ...(input.targetLocations || [])].filter(Boolean))];
  const items = (input.targetItems || []).filter(Boolean);
  const locationHint = locations.join(", ");

  const system = `You generate realistic buyer-intent questions that potential customers would type into an AI assistant when looking for a business like this — never naming the business itself.

Rules:
- Return ONLY a JSON array of exactly ${count} short question strings
- Every question MUST mention a location (${locationHint}, ${input.country})
- At least ${Math.min(count, Math.max(1, items.length))} questions MUST relate to these services/products: ${items.join(", ") || input.category}
- Mix intents: discovery ("best X in…"), comparison ("who should I hire for…"), and recommendation ("where can I get…")
- No markdown, no prose outside the JSON array`;

  const userMsg = [
    `Business: ${input.business.name}`,
    `Category: ${input.category}`,
    `Primary city: ${input.city}`,
    `Country: ${input.country}`,
    `Service areas: ${locationHint}`,
    `Target services/products: ${items.join(", ") || "general " + input.category}`,
    `Description: ${input.business.description || ""}`,
  ].join("\n");

  const { text } = await callTaskModel({
    model,
    prompt: userMsg,
    system,
    usage: {
      userId: input.usage?.userId,
      businessId: input.usage?.businessId,
      feature: "prompts",
    },
  });

  const parsed = safeParseJSON<string[]>(text);

  if (!parsed || !Array.isArray(parsed) || !parsed.length) {
    throw new Error("Couldn't auto-generate prompts, try again.");
  }

  return parsed.slice(0, count).map(String);
}
