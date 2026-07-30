import type { VisibilityModelConfig } from "@aeo-pcs/shared";
import { callAnthropicWithWebSearch } from "./claude";
import { callGeminiWithWebSearch } from "./gemini";
import { callOpenAIWithWebSearch } from "./openai";
import { callPerplexityWithWebSearch } from "./perplexity";
import type { LlmCallResult, LlmPricing, LlmUsageContext } from "./llmTypes";

export async function callVisibilityModel(input: {
  model: VisibilityModelConfig;
  prompt: string;
  system: string;
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
    usage: input.usage,
    pricing,
  };

  switch (input.model.provider) {
    case "google":
      return callGeminiWithWebSearch(common);
    case "openai":
      return callOpenAIWithWebSearch(common);
    case "perplexity":
      return callPerplexityWithWebSearch(common);
    case "anthropic":
      return callAnthropicWithWebSearch(common);
    default:
      throw new Error(
        `Provider "${input.model.provider}" is not supported for visibility checks`
      );
  }
}
