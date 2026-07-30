import type {
  PromptResult,
  Source,
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
}): Promise<{ results: PromptResult[]; score: VisibilityScore; partialWarning: string | null }> {
  if (!input.models.length) {
    throw new Error("No visibility models configured");
  }

  const total = input.prompts.length * input.models.length;
  let completed = 0;
  let failedChecks = 0;
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

    const perModel: PromptResult["perModel"] = [];
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

      let text = "";
      let dedupedSources: Source[] = [];

      try {
        const result = await callVisibilityModel({
          model,
          prompt: userPrompt,
          system,
          usage: usageCtx,
        });
        text = result.text;
        dedupedSources = dedupeSources(result.sources);
      } catch (err) {
        failedChecks += 1;
        const message = err instanceof Error ? err.message : "Model request failed";
        console.warn(`Visibility ${model.label} failed for prompt: ${message}`);
        perModel.push({
          model: model.label,
          answer: "",
          mentioned: false,
          sourceMentioned: false,
          position: null,
          sentiment: null,
          brandsMentioned: [],
          sources: [],
        });
        completed += 1;
        continue;
      }

      const mentioned = isBrandMentioned(text, bizCtx);
      const sourceMentioned = isSourceMentioned(dedupedSources, bizCtx);

      let position: number | null = null;
      let sentiment = null as PromptResult["perModel"][0]["sentiment"];
      let brandsMentioned: string[] = [];

      if (text.trim()) {
        try {
          const analysis = await analyzeVisibilityAnswer({
            answer: text,
            business: bizCtx,
            citedDomains: dedupedSources.map((s) => s.domain).filter(Boolean),
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
        } catch (err) {
          const message = err instanceof Error ? err.message : "Analysis failed";
          console.warn(`Visibility analysis failed for ${model.label}: ${message}`);
        }
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

  const partialWarning =
    failedChecks > 0
      ? `${failedChecks} of ${total} AI responses could not be retrieved. Your score is based on the ${total - failedChecks} completed checks.`
      : null;

  return {
    results: allResults,
    score: computeScore(allResults, input.models.length),
    partialWarning,
  };
}
