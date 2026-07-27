import type { BusinessCandidate } from "@aeo-pcs/shared";
import { callClaude } from "./claude";
import { safeParseJSON } from "../utils/llm";

export async function searchBusiness(
  name: string,
  city: string,
  country: string
): Promise<BusinessCandidate[]> {
  const system = `You help find real businesses using web search. Search the web for the business the user names, in the given city and country. Return ONLY a JSON array (no prose, no markdown fences) of up to 4 candidate matches, each with fields: name, category, address, description.`;
  const userMsg = `Business name: "${name}", City: "${city}", Country: "${country}"`;
  const { text } = await callClaude({
    prompt: userMsg,
    system,
    useWebSearch: true,
    usage: { feature: "business_search" },
  });
  const parsed = safeParseJSON<BusinessCandidate[]>(text);

  if (parsed && Array.isArray(parsed) && parsed.length) {
    return parsed.slice(0, 4);
  }

  return [
    {
      name,
      category: "Other",
      address: `${city}, ${country}`,
      description: "No verified match found, proceeding with entered name.",
    },
  ];
}
