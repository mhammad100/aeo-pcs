import { env } from "../config/env";
import { logUsageEvent } from "./usage.service";
import { sourceFromUrl, type LlmCallResult, type LlmPricing, type LlmUsageContext } from "./llmTypes";

function requireGoogleKey() {
  if (!env.googleAiApiKey) {
    throw new Error("GOOGLE_AI_API_KEY is not configured");
  }
  return env.googleAiApiKey;
}

async function callGeminiGenerateContent(
  options: {
    modelId: string;
    prompt: string;
    system: string;
    maxTokens?: number;
    usage?: LlmUsageContext;
    pricing?: LlmPricing;
  },
  withWebSearch: boolean
): Promise<LlmCallResult> {
  const apiKey = requireGoogleKey();
  const modelPath = encodeURIComponent(options.modelId);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelPath}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: options.system }] },
      contents: [{ role: "user", parts: [{ text: options.prompt }] }],
      ...(withWebSearch ? { tools: [{ google_search: {} }] } : {}),
      generationConfig: {
        maxOutputTokens: options.maxTokens ?? 1200,
      },
    }),
  });

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      groundingMetadata?: {
        groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>;
        groundingSupports?: Array<{ groundingChunkIndices?: number[] }>;
      };
    }>;
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    };
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(data.error?.message || `Gemini API error (${res.status})`);
  }

  const candidate = data.candidates?.[0];
  const text =
    candidate?.content?.parts
      ?.map((p) => p.text || "")
      .join("\n")
      .trim() || "";

  const sources: LlmCallResult["sources"] = [];
  for (const chunk of candidate?.groundingMetadata?.groundingChunks || []) {
    if (chunk.web?.uri) {
      const src = sourceFromUrl(chunk.web.uri, chunk.web.title);
      if (src) sources.push(src);
    }
  }

  const inputTokens = data.usageMetadata?.promptTokenCount ?? 0;
  const outputTokens = data.usageMetadata?.candidatesTokenCount ?? 0;

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

/** Plain chat completion (no web search). */
export async function callGemini(options: {
  modelId: string;
  prompt: string;
  system: string;
  maxTokens?: number;
  usage?: LlmUsageContext;
  pricing?: LlmPricing;
}): Promise<LlmCallResult> {
  return callGeminiGenerateContent(options, false);
}

export async function callGeminiWithWebSearch(options: {
  modelId: string;
  prompt: string;
  system: string;
  maxTokens?: number;
  usage?: LlmUsageContext;
  pricing?: LlmPricing;
}): Promise<LlmCallResult> {
  return callGeminiGenerateContent(options, true);
}
