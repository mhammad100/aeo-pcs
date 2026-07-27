export function safeParseJSON<T = unknown>(text: string): T | null {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/[\[{][\s\S]*[\]}]/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

export function extractMentioned(answerText: string, brandName: string): boolean {
  const re = new RegExp(brandName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  return re.test(answerText);
}

export function dedupeSources<T extends { domain: string }>(sources: T[]): T[] {
  const seen = new Map<string, T>();
  sources.forEach((s) => {
    if (!seen.has(s.domain)) seen.set(s.domain, s);
  });
  return Array.from(seen.values());
}

export const NO_MARKDOWN_RULE =
  "Write in plain prose sentences and short paragraphs only. Never use markdown formatting of any kind: no hashes, no asterisks, no bullet dashes, no numbered list markers, no bold or italic symbols. If you need to separate items, use a new line and a short label followed by a colon, written as plain text.";
