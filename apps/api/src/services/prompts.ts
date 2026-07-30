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
  const neighborhoods = (input.targetLocations || []).filter(
    (loc) => loc.trim().toLowerCase() !== input.city.trim().toLowerCase()
  );
  const items = (input.targetItems || []).filter(Boolean);
  const locationHint = locations.join(", ");
  const description = (input.business.description || "").trim();
  const coreTraits = description || input.category;

  const system = `You generate realistic buyer-intent questions that potential customers would type into an AI assistant when looking for THIS SPECIFIC business — never naming the business itself.

Questions must reflect how someone would discover this business based on what makes it unique (cuisine, ambience, services, dietary options, hours, neighborhood, vibe), NOT generic category searches that could apply to any business in the city.

Rules:
- Return ONLY a JSON array of exactly ${count} short question strings
- Every question MUST include a location reference (${locationHint}, ${input.country})
- At least 3 questions MUST reflect distinct traits from the business description below (ambience, cuisine mix, veg status, specialty items, hours, vibe, etc.)
${neighborhoods.length ? `- At least 2 questions MUST mention a specific area/neighborhood: ${neighborhoods.join(", ")}` : `- At least 1 question should use a specific part of ${input.city}, not only the city name`}
${items.length ? `- Weave these offerings naturally where relevant: ${items.join(", ")}` : `- Match category "${input.category}" but stay specific to this business's positioning`}
- Do NOT use overly broad queries like "best pizza in [city]" or "good coffee shops in [city]" unless that exact offering is a core differentiator in the description
- Do NOT generate catering, B2B, or "who should I hire" prompts unless the description clearly offers event catering or services
- Prefer queries a real customer of THIS business would ask: vibe/ambience, dietary needs, cuisine mix, late hours, neighborhood, specialty menu items
- Mix discovery and recommendation intents — all tied to this business's niche
- No markdown, no prose outside the JSON array`;

  const userMsg = [
    `Business: ${input.business.name}`,
    `Category: ${input.category}`,
    `Primary city: ${input.city}`,
    `Country: ${input.country}`,
    `Service areas / neighborhoods: ${locationHint}`,
    `Target services/products: ${items.join(", ") || "derive from description and category"}`,
    `What makes this business distinct (use heavily): ${coreTraits}`,
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
