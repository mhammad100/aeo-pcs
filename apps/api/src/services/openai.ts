import { env } from "../config/env";
import { readFetchJson } from "../utils/httpJson";
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

  const data = await readFetchJson<{
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
    error?: { message?: string };
  }>(res);

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

const DEFAULT_VISIBILITY_MAX_OUTPUT_TOKENS = 4096;

type ResponsesOutputBlock = {
  type?: string;
  text?: string;
  annotations?: Array<{ type?: string; url?: string; title?: string }>;
};

type ResponsesOutputItem = {
  type?: string;
  content?: ResponsesOutputBlock[];
};

function usesOpenAiReasoning(modelId: string): boolean {
  return /^(gpt-5|o\d)/i.test(modelId);
}

function parseResponsesApiOutput(data: {
  output_text?: string;
  output?: ResponsesOutputItem[];
}): { text: string; sources: LlmCallResult["sources"] } {
  const textParts: string[] = [];
  const sources: LlmCallResult["sources"] = [];

  const pushText = (value?: string) => {
    const trimmed = value?.trim();
    if (trimmed) textParts.push(trimmed);
  };

  pushText(data.output_text);

  for (const item of data.output || []) {
    if (item.type !== "message") continue;
    for (const block of item.content || []) {
      if (block.type === "output_text") {
        pushText(block.text);
      }
      for (const ann of block.annotations || []) {
        if (ann.type === "url_citation" && ann.url) {
          const src = sourceFromUrl(ann.url, ann.title);
          if (src) sources.push(src);
        }
      }
    }
  }

  return { text: textParts.join("\n\n"), sources };
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

  const body: Record<string, unknown> = {
    model: options.modelId,
    tools: [{ type: "web_search" }],
    max_output_tokens: options.maxTokens ?? DEFAULT_VISIBILITY_MAX_OUTPUT_TOKENS,
    text: { format: { type: "text" } },
    input: [
      { role: "developer", content: options.system },
      { role: "user", content: options.prompt },
    ],
  };

  if (usesOpenAiReasoning(options.modelId)) {
    body.reasoning = { effort: "low" };
  }

  const res = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const data = await readFetchJson<{
    output_text?: string;
    output?: ResponsesOutputItem[];
    usage?: { input_tokens?: number; output_tokens?: number };
    error?: { message?: string };
  }>(res);

  if (!res.ok) {
    throw new Error(data.error?.message || `OpenAI Responses API error (${res.status})`);
  }

  const { text, sources } = parseResponsesApiOutput(data);

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
