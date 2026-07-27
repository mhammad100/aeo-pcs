import type { Source } from "@aeo-pcs/shared";
import { env } from "../config/env";
import { logUsageEvent } from "./usage.service";

export type ClaudeCallResult = {
  text: string;
  sources: Source[];
  inputTokens: number;
  outputTokens: number;
};

export type ClaudeUsageContext = {
  userId?: string | null;
  businessId?: string | null;
  feature: string;
  refs?: Record<string, unknown>;
};

type ClaudeContentBlock = {
  type: string;
  text?: string;
  content?: Array<{ url?: string; title?: string }>;
};

export async function callClaude(options: {
  prompt: string;
  system: string;
  useWebSearch?: boolean;
  maxTokens?: number;
  usage?: ClaudeUsageContext;
}): Promise<ClaudeCallResult> {
  const body: Record<string, unknown> = {
    model: env.anthropicModel,
    max_tokens: options.maxTokens ?? 1200,
    system: options.system,
    messages: [{ role: "user", content: options.prompt }],
  };

  if (options.useWebSearch) {
    body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.anthropicApiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "web-search-2025-03-05",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as {
    content?: ClaudeContentBlock[];
    usage?: { input_tokens?: number; output_tokens?: number };
    error?: { message?: string };
  };

  if (!res.ok) {
    throw new Error(data.error?.message || `Anthropic API error (${res.status})`);
  }

  const content = data.content || [];
  const text = content
    .filter((b) => b.type === "text")
    .map((b) => b.text || "")
    .join("\n");

  const sources: Source[] = [];
  content
    .filter((b) => b.type === "web_search_tool_result")
    .forEach((b) => {
      const items = Array.isArray(b.content) ? b.content : [];
      items.forEach((it) => {
        if (it.url) {
          try {
            const domain = new URL(it.url).hostname.replace(/^www\./, "");
            sources.push({ domain, url: it.url, title: it.title || domain });
          } catch {
            // ignore invalid URLs
          }
        }
      });
    });

  const inputTokens = data.usage?.input_tokens ?? 0;
  const outputTokens = data.usage?.output_tokens ?? 0;

  if (options.usage?.feature) {
    await logUsageEvent({
      userId: options.usage.userId,
      businessId: options.usage.businessId,
      feature: options.usage.feature,
      model: env.anthropicModel,
      inputTokens,
      outputTokens,
      refs: options.usage.refs,
    });
  }

  return { text, sources, inputTokens, outputTokens };
}
