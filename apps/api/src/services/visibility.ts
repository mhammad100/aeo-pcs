import { MODELS, type PromptResult, type VisibilityScore } from "@aeo-pcs/shared";
import { callClaude, type ClaudeUsageContext } from "./claude";
import { dedupeSources, extractMentioned, NO_MARKDOWN_RULE } from "../utils/llm";

export function computeScore(results: PromptResult[]): VisibilityScore {
  const totalChecks = results.length * MODELS.length;
  const totalMentions = results.reduce(
    (sum, r) => sum + r.perModel.filter((m) => m.mentioned).length,
    0
  );
  return {
    totalChecks,
    totalMentions,
    visibilityPct: totalChecks ? Math.round((totalMentions / totalChecks) * 100) : 0,
  };
}

export async function runVisibilityCheck(input: {
  businessName: string;
  prompts: string[];
  usage?: Omit<ClaudeUsageContext, "feature">;
  onProgress?: (info: {
    completed: number;
    total: number;
    currentPrompt: string;
    currentModel: string;
  }) => Promise<void> | void;
}): Promise<{ results: PromptResult[]; score: VisibilityScore }> {
  const total = input.prompts.length * MODELS.length;
  let completed = 0;
  const allResults: PromptResult[] = [];

  for (const prompt of input.prompts) {
    const perModel = [];
    for (const model of MODELS) {
      if (input.onProgress) {
        await input.onProgress({ completed, total, currentPrompt: prompt, currentModel: model });
      }

      const system = `You are simulating how a ${model} AI assistant answers a real user's question, grounded in actual current web search results. Search the web, then answer naturally as that assistant would, naming specific real businesses relevant to the query and location. Keep it to 4-6 sentences and name at least 2-3 businesses if the search results support it. ${NO_MARKDOWN_RULE}`;
      const { text, sources } = await callClaude({
        prompt,
        system,
        useWebSearch: true,
        usage: input.usage
          ? {
              ...input.usage,
              feature: "visibility",
              refs: { ...(input.usage.refs || {}), simulatedModel: model },
            }
          : undefined,
      });
      const mentioned = extractMentioned(text, input.businessName);
      perModel.push({
        model,
        answer: text,
        mentioned,
        sources: dedupeSources(sources),
      });
      completed += 1;
    }
    allResults.push({ prompt, perModel });
  }

  if (input.onProgress) {
    await input.onProgress({
      completed: total,
      total,
      currentPrompt: "",
      currentModel: "",
    });
  }

  return { results: allResults, score: computeScore(allResults) };
}
