import type {
  PromptResult,
  VisibilityModelConfig,
  VisibilityScore,
} from "@aeo-pcs/shared";
import { dedupeSources, NO_MARKDOWN_RULE } from "../utils/llm";
import {
  buildVisibilityUserPrompt,
  computeScore,
  isBrandMentioned,
  isSourceMentioned,
  type VisibilityBusinessContext,
} from "../utils/visibilityAnalysis";
import type { LlmUsageContext } from "./llmTypes";
import { analyzeVisibilityAnswer } from "./visibilityAnswerAnalysis";
import { callVisibilityModel } from "./visibilityModelRunner";

export { computeScore };

export async function runVisibilityCheck(input: {
  business: VisibilityBusinessContext;
  category: string;
  city: string;
  country: string;
  targetLocations?: string[];
  targetItems?: string[];
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

  const system = `You are an AI assistant answering a real user's question, grounded in actual current web search results. Search the web, then answer naturally, naming specific real businesses relevant to the query and the location context provided. Keep it to 4-6 sentences and name at least 2-3 businesses if the search results support it. ${NO_MARKDOWN_RULE}`;

  const bizCtx: VisibilityBusinessContext = {
    name: input.business.name,
    nameAliases: input.business.nameAliases,
    websiteUrl: input.business.websiteUrl,
    googleBusinessUrl: input.business.googleBusinessUrl,
  };

  for (const prompt of input.prompts) {
    const userPrompt = buildVisibilityUserPrompt({
      prompt,
      category: input.category,
      city: input.city,
      country: input.country,
      targetLocations: input.targetLocations,
      targetItems: input.targetItems,
    });

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

      const usageCtx: LlmUsageContext | undefined = input.usage
        ? {
            ...input.usage,
            feature: "visibility",
            refs: {
              ...(input.usage.refs || {}),
              visibilityModelId: model.id,
              visibilityModelLabel: model.label,
            },
          }
        : undefined;

      const { text, sources } = await callVisibilityModel({
        model,
        prompt: userPrompt,
        system,
        usage: usageCtx,
      });

      const dedupedSources = dedupeSources(sources);
      const mentioned = isBrandMentioned(text, bizCtx);
      const sourceMentioned = isSourceMentioned(dedupedSources, bizCtx);

      let position: number | null = null;
      let sentiment = null as PromptResult["perModel"][0]["sentiment"];
      let brandsMentioned: string[] = [];

      if (text.trim()) {
        const analysis = await analyzeVisibilityAnswer({
          answer: text,
          business: bizCtx,
          usage: input.usage
            ? {
                userId: input.usage.userId,
                businessId: input.usage.businessId,
                refs: {
                  ...(input.usage.refs || {}),
                  visibilityModelId: model.id,
                },
              }
            : undefined,
        });
        position = analysis.position;
        sentiment = analysis.sentiment;
        brandsMentioned = analysis.brandsMentioned;
      }

      perModel.push({
        model: model.label,
        answer: text,
        mentioned,
        sourceMentioned,
        position,
        sentiment,
        brandsMentioned,
        sources: dedupedSources,
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
