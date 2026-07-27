import type { Source } from "@aeo-pcs/shared";
import { assertAnthropicConfigured, env } from "../config/env";

export type ClaudeCallResult = {
  text: string;
  sources: Source[];
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
}): Promise<ClaudeCallResult> {
  assertAnthropicConfigured();

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

  return { text, sources };
}
