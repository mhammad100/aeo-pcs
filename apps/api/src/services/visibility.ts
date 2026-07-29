import type {
  PromptResult,
  VisibilityModelConfig,
  VisibilityScore,
} from "@aeo-pcs/shared";
import { dedupeSources, extractMentioned, NO_MARKDOWN_RULE } from "../utils/llm";
import type { LlmUsageContext } from "./llmTypes";
import { callVisibilityModel } from "./visibilityModelRunner";

export function computeScore(
  results: PromptResult[],
  modelCount: number
): VisibilityScore {
  const totalChecks = results.length * modelCount;
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
  models: VisibilityModelConfig[];
  usage?: Omit<LlmUsageContext, "feature">;
  onProgress?: (info: {
    completed: number;
    total: number;
    currentPrompt: string;
    currentModel: string;
  }) => Promise<void> | void;
}): Promise<{ results: PromptResult[]; score: VisibilityScore }> {
  if (!input.models.length) {
    throw new Error("No visibility models configured");
  }

  const total = input.prompts.length * input.models.length;
  let completed = 0;
  const allResults: PromptResult[] = [];

  const system = `You are an AI assistant answering a real user's question, grounded in actual current web search results. Search the web, then answer naturally, naming specific real businesses relevant to the query and location. Keep it to 4-6 sentences and name at least 2-3 businesses if the search results support it. ${NO_MARKDOWN_RULE}`;

  for (const prompt of input.prompts) {
    const perModel = [];
    for (const model of input.models) {
      if (input.onProgress) {
        await input.onProgress({
          completed,
          total,
          currentPrompt: prompt,
          currentModel: model.label,
        });
      }

      const { text, sources } = await callVisibilityModel({
        model,
        prompt,
        system,
        usage: input.usage
          ? {
              ...input.usage,
              feature: "visibility",
              refs: {
                ...(input.usage.refs || {}),
                visibilityModelId: model.id,
                visibilityModelLabel: model.label,
              },
            }
          : undefined,
      });

      const mentioned = extractMentioned(text, input.businessName);
      perModel.push({
        model: model.label,
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

  return {
    results: allResults,
    score: computeScore(allResults, input.models.length),
  };
}
