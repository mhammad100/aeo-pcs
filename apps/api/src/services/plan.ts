import type { ActionPlan, AutomatableItem, BusinessCandidate, PromptResult } from "@aeo-pcs/shared";
import { callClaude } from "./claude";
import { dedupeSources, NO_MARKDOWN_RULE, safeParseJSON } from "../utils/llm";

export async function buildActionPlan(input: {
  business: BusinessCandidate;
  category: string;
  city: string;
  country: string;
  results: PromptResult[];
}): Promise<ActionPlan> {
  const allSourceDomains = dedupeSources(input.results.flatMap((r) => r.perModel.flatMap((m) => m.sources)))
    .slice(0, 12)
    .map((s) => s.domain)
    .join(", ");

  const competitorContext = input.results
    .map((r) => `Prompt: ${r.prompt}\n` + r.perModel.map((m) => `${m.model}: ${m.answer}`).join("\n"))
    .join("\n\n");

  const system = `You are an AI visibility consultant. Analyze why the business "${input.business.name}" (${input.category}, ${input.city}, ${input.country}) is or isn't appearing in AI assistant answers, given the domains currently getting cited and the model answers below. Produce ONLY a JSON object with two arrays: automatable and manual. Each item in automatable is content or copy this tool can generate right now for the business owner, with fields id (short slug), title (short action label, plain text, five words max), description (one plain sentence explaining what it produces). Include 3 to 5 automatable items such as an FAQ content block, a comparison paragraph, a Google Business Profile description, a structured data snippet description, or short-form answer content for forums. Each item in manual is a real-world action the business owner must do themselves that this tool cannot do for them, with fields title (short action label, five words max) and guidance (two to three plain sentences explaining exactly what to do and why it helps AI visibility, no markdown). Include 3 to 5 manual items such as claiming or updating a Google Business Profile, getting listed on specific relevant directories, earning reviews on Google or industry-specific platforms, getting mentioned in local press or blogs, or building presence on forums like Reddit or Quora where AI models pull citations from. Return valid JSON only, no markdown fences, no extra text.`;

  const userMsg = `Domains currently cited by AI models instead of this business: ${allSourceDomains || "none captured"}\n\nContext from AI answers:\n${competitorContext}`;

  const { text } = await callClaude({ prompt: userMsg, system, useWebSearch: false });
  const parsed = safeParseJSON<ActionPlan>(text);

  if (!parsed?.automatable || !parsed?.manual) {
    throw new Error("Couldn't build the action plan, try again.");
  }

  return parsed;
}

export async function generateItemContent(input: {
  business: BusinessCandidate;
  category: string;
  city: string;
  country: string;
  item: Pick<AutomatableItem, "title" | "description">;
}): Promise<string> {
  const system = `You are a GEO content writer producing one specific piece of ready-to-publish content for a small business, so an AI assistant is more likely to cite them. ${NO_MARKDOWN_RULE} Keep the output focused and directly usable, roughly 120 to 220 words unless the task clearly needs more.`;
  const userMsg = `Business: ${input.business.name}, ${input.category}, ${input.city}, ${input.country}\nDescription: ${input.business.description || ""}\n\nTask: ${input.item.title}\nDetail: ${input.item.description}\n\nWrite the actual content now, ready to copy and publish.`;
  const { text } = await callClaude({ prompt: userMsg, system, useWebSearch: false });
  return text;
}
