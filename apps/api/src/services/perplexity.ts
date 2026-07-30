import { env } from "../config/env";
import { readFetchJson } from "../utils/httpJson";
import { logUsageEvent } from "./usage.service";
import { sourceFromUrl, type LlmCallResult, type LlmPricing, type LlmUsageContext } from "./llmTypes";

function requirePerplexityKey() {
  if (!env.perplexityApiKey) {
    throw new Error("PERPLEXITY_API_KEY is not configured");
  }
  return env.perplexityApiKey;
}

export async function callPerplexity(options: {
  modelId: string;
  prompt: string;
  system: string;
  maxTokens?: number;
  usage?: LlmUsageContext;
  pricing?: LlmPricing;
}): Promise<LlmCallResult> {
  return callPerplexityWithWebSearch(options);
}

export async function callPerplexityWithWebSearch(options: {
  modelId: string;
  prompt: string;
  system: string;
  maxTokens?: number;
  usage?: LlmUsageContext;
  pricing?: LlmPricing;
}): Promise<LlmCallResult> {
  const apiKey = requirePerplexityKey();

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.modelId,
      messages: [
        { role: "system", content: options.system },
        { role: "user", content: options.prompt },
      ],
      max_tokens: options.maxTokens ?? 1200,
    }),
  });

  const data = await readFetchJson<{
    choices?: Array<{ message?: { content?: string } }>;
    citations?: string[];
    search_results?: Array<{ url?: string; title?: string }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    error?: { message?: string } | string;
  }>(res);

  if (!res.ok) {
    const message =
      typeof data.error === "string"
        ? data.error
        : data.error?.message || `Perplexity API error (${res.status})`;
    throw new Error(message);
  }

  const text = data.choices?.[0]?.message?.content?.trim() || "";
  const sources: LlmCallResult["sources"] = [];

  for (const result of data.search_results || []) {
    if (result.url) {
      const src = sourceFromUrl(result.url, result.title);
      if (src) sources.push(src);
    }
  }

  if (!sources.length) {
    for (const citation of data.citations || []) {
      const src = sourceFromUrl(citation);
      if (src) sources.push(src);
    }
  }

  const inputTokens = data.usage?.prompt_tokens ?? 0;
  const outputTokens = data.usage?.completion_tokens ?? 0;

  if (options.usage?.feature) {
    await logUsageEvent({
      userId: options.usage.userId,
      businessId: options.usage.businessId,
      feature: options.usage.feature,
      model: options.modelId,
      inputTokens,
      outputTokens,
      pricing: options.pricing,
      refs: options.usage.refs,
    });
  }

  return { text, sources, inputTokens, outputTokens, model: options.modelId };
}
