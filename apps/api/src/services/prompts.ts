import type { BusinessCandidate } from "@aeo-pcs/shared";
import { callClaude } from "./claude";
import { safeParseJSON } from "../utils/llm";

export async function generatePrompts(input: {
  business: BusinessCandidate;
  category: string;
  city: string;
}): Promise<string[]> {
  const system = `You generate realistic buyer-intent questions that potential customers would type into an AI assistant when looking for a business like this, not naming the business itself. Return ONLY a JSON array of exactly 5 short question strings, no markdown, no prose.`;
  const userMsg = `Business: ${input.business.name}\nCategory: ${input.category}\nCity: ${input.city}\nDescription: ${input.business.description || ""}`;
  const { text } = await callClaude({ prompt: userMsg, system, useWebSearch: false });
  const parsed = safeParseJSON<string[]>(text);

  if (!parsed || !Array.isArray(parsed) || !parsed.length) {
    throw new Error("Couldn't auto-generate prompts, try again.");
  }

  return parsed.slice(0, 5).map(String);
}
