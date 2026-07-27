import type { BusinessCandidate } from "@aeo-pcs/shared";
import { callClaude } from "./claude";
import { safeParseJSON } from "../utils/llm";

export async function searchBusiness(name: string, city: string): Promise<BusinessCandidate[]> {
  const system = `You help find real businesses using web search. Search the web for the business the user names, in the given city. Return ONLY a JSON array (no prose, no markdown fences) of up to 4 candidate matches, each with fields: name, category, address, description.`;
  const userMsg = `Business name: "${name}", City: "${city}"`;
  const { text } = await callClaude({ prompt: userMsg, system, useWebSearch: true });
  const parsed = safeParseJSON<BusinessCandidate[]>(text);

  if (parsed && Array.isArray(parsed) && parsed.length) {
    return parsed.slice(0, 4);
  }

  return [
    {
      name,
      category: "Other",
      address: city,
      description: "No verified match found, proceeding with entered name.",
    },
  ];
}
