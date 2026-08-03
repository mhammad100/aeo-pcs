import type { TaskModelConfig } from "@aeo-pcs/shared";
import { callAnthropic, callAnthropicWithWebSearch } from "./claude";
import { callGemini, callGeminiWithWebSearch } from "./gemini";
import { callOpenAI, callOpenAIWithWebSearch } from "./openai";
import { callPerplexity, callPerplexityWithWebSearch } from "./perplexity";
import type { LlmCallResult, LlmPricing, LlmUsageContext } from "./llmTypes";

function taskModelPricing(model: TaskModelConfig): LlmPricing {
  return {
    inputPer1MTokens: model.inputPer1MTokens,
    outputPer1MTokens: model.outputPer1MTokens,
    currency: model.currency,
  };
}

export async function callTaskModel(input: {
  model: TaskModelConfig;
  prompt: string;
  system: string;
  maxTokens?: number;
  usage?: LlmUsageContext;
}): Promise<LlmCallResult> {
  const pricing = taskModelPricing(input.model);

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

export async function callTaskModelWithWebSearch(input: {
  model: TaskModelConfig;
  prompt: string;
  system: string;
  maxTokens?: number;
  usage?: LlmUsageContext;
}): Promise<LlmCallResult> {
  const pricing = taskModelPricing(input.model);

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
      return callGeminiWithWebSearch(common);
    case "openai":
      return callOpenAIWithWebSearch(common);
    case "perplexity":
      return callPerplexityWithWebSearch(common);
    case "anthropic":
      return callAnthropicWithWebSearch(common);
    default:
      throw new Error(
        `Provider "${input.model.provider}" is not supported for web search`
      );
  }
}
