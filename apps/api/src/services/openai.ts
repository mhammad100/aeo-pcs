import { env } from "../config/env";
import { logUsageEvent } from "./usage.service";
import { sourceFromUrl, type LlmCallResult, type LlmPricing, type LlmUsageContext } from "./llmTypes";

type OpenAiMessage = { role: "system" | "user" | "assistant"; content: string };

function requireOpenAiKey() {
  if (!env.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return env.openaiApiKey;
}

async function logIfNeeded(input: {
  model: string;
  inputTokens: number;
  outputTokens: number;
  usage?: LlmUsageContext;
  pricing?: LlmPricing;
}) {
  if (!input.usage?.feature) return;
  await logUsageEvent({
    userId: input.usage.userId,
    businessId: input.usage.businessId,
    feature: input.usage.feature,
    model: input.model,
    inputTokens: input.inputTokens,
    outputTokens: input.outputTokens,
    pricing: input.pricing,
    refs: input.usage.refs,
  });
}

/** Prompt generation and other non-search OpenAI chat calls. */
export async function callOpenAI(options: {
  modelId: string;
  prompt: string;
  system: string;
  maxTokens?: number;
  usage?: LlmUsageContext;
  pricing?: LlmPricing;
}): Promise<LlmCallResult> {
  const apiKey = requireOpenAiKey();
  const messages: OpenAiMessage[] = [
    { role: "system", content: options.system },
    { role: "user", content: options.prompt },
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.modelId,
      messages,
      max_tokens: options.maxTokens ?? 1200,
    }),
  });

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(data.error?.message || `OpenAI API error (${res.status})`);
  }

  const text = data.choices?.[0]?.message?.content?.trim() || "";
  const inputTokens = data.usage?.prompt_tokens ?? 0;
  const outputTokens = data.usage?.completion_tokens ?? 0;

  await logIfNeeded({
    model: options.modelId,
    inputTokens,
    outputTokens,
    usage: options.usage,
    pricing: options.pricing,
  });

  return { text, sources: [], inputTokens, outputTokens, model: options.modelId };
}

/** Visibility checks with OpenAI web search via the Responses API. */
export async function callOpenAIWithWebSearch(options: {
  modelId: string;
  prompt: string;
  system: string;
  maxTokens?: number;
  usage?: LlmUsageContext;
  pricing?: LlmPricing;
}): Promise<LlmCallResult> {
  const apiKey = requireOpenAiKey();

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.modelId,
      tools: [{ type: "web_search_preview" }],
      max_output_tokens: options.maxTokens ?? 1200,
      input: [
        { role: "developer", content: options.system },
        { role: "user", content: options.prompt },
      ],
    }),
  });

  const data = (await res.json()) as {
    output_text?: string;
    output?: Array<{
      type?: string;
      content?: Array<{
        type?: string;
        text?: string;
        annotations?: Array<{ type?: string; url?: string; title?: string }>;
      }>;
    }>;
    usage?: { input_tokens?: number; output_tokens?: number };
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(data.error?.message || `OpenAI Responses API error (${res.status})`);
  }

  let text = data.output_text?.trim() || "";
  const sources: LlmCallResult["sources"] = [];

  for (const item of data.output || []) {
    for (const block of item.content || []) {
      if (block.type === "output_text" && block.text && !text) {
        text = block.text.trim();
      }
      for (const ann of block.annotations || []) {
        if (ann.type === "url_citation" && ann.url) {
          const src = sourceFromUrl(ann.url, ann.title);
          if (src) sources.push(src);
        }
      }
    }
  }

  const inputTokens = data.usage?.input_tokens ?? 0;
  const outputTokens = data.usage?.output_tokens ?? 0;

  await logIfNeeded({
    model: options.modelId,
    inputTokens,
    outputTokens,
    usage: options.usage,
    pricing: options.pricing,
  });

  return { text, sources, inputTokens, outputTokens, model: options.modelId };
}
