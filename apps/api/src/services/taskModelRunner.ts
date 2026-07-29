import type { TaskModelConfig } from "@aeo-pcs/shared";
import { callAnthropic } from "./claude";
import { callGemini } from "./gemini";
import { callOpenAI } from "./openai";
import { callPerplexity } from "./perplexity";
import type { LlmCallResult, LlmPricing, LlmUsageContext } from "./llmTypes";

export async function callTaskModel(input: {
  model: TaskModelConfig;
  prompt: string;
  system: string;
  maxTokens?: number;
  usage?: LlmUsageContext;
}): Promise<LlmCallResult> {
  const pricing: LlmPricing = {
    inputPer1MTokens: input.model.inputPer1MTokens,
    outputPer1MTokens: input.model.outputPer1MTokens,
    currency: input.model.currency,
  };

  const common = {
    modelId: input.model.modelId,
    prompt: input.prompt,
    system: input.system,
    maxTokens: input.maxTokens,
    usage: input.usage,
    pricing,
  };

  switch (input.model.provider) {
    case "google":
      return callGemini(common);
    case "openai":
      return callOpenAI(common);
    case "perplexity":
      return callPerplexity(common);
    case "anthropic":
      return callAnthropic(common);
    default:
      throw new Error(`Provider "${input.model.provider}" is not supported`);
  }
}
