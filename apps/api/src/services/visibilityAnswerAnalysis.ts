import type { MentionSentiment } from "@aeo-pcs/shared";
import { filterBusinessBrands } from "@aeo-pcs/shared";
import { getAeoSettings } from "./aeoSettings.service";
import { callTaskModel } from "./taskModelRunner";
import {
  collectMentionNames,
  parseAnswerAnalysisJson,
  type VisibilityBusinessContext,
} from "../utils/visibilityAnalysis";

export async function analyzeVisibilityAnswer(input: {
  answer: string;
  business: VisibilityBusinessContext;
  usage?: { userId?: string | null; businessId?: string | null; refs?: Record<string, unknown> };
}): Promise<{
  position: number | null;
  sentiment: MentionSentiment | null;
  brandsMentioned: string[];
}> {
  const targetNames = collectMentionNames(input.business);
  if (!input.answer.trim() || !targetNames.length) {
    return { position: null, sentiment: null, brandsMentioned: [] };
  }

  const settings = await getAeoSettings();
  const model = settings.promptGenerationModel;
  if (model.enabled === false) {
    return { position: null, sentiment: null, brandsMentioned: [] };
  }

  const system = `You analyze AI assistant answers for brand visibility research. Return ONLY a JSON object with:
- brandsMentioned: array of LOCAL BUSINESS names explicitly recommended or named, in order of appearance. Include only restaurants, cafés, shops, clinics, or similar establishments a customer could visit or hire.
- targetPosition: 1-based index of the target business in brandsMentioned, or null if not listed
- sentiment: "positive", "neutral", or "negative" for how the target business is described (null if not mentioned)

EXCLUDE from brandsMentioned: directories (Justdial, Yelp, TripAdvisor), delivery apps (Swiggy, Zomato), social platforms (Instagram, Facebook), search engines (Google), media/blog sites, and generic platforms — even if named in the answer.

Target business names to find: ${targetNames.join(" | ")}
No markdown, no prose outside JSON.`;

  try {
    const { text } = await callTaskModel({
      model,
      prompt: input.answer.slice(0, 4000),
      system,
      maxTokens: 400,
      usage: input.usage
        ? { ...input.usage, feature: "visibility_analysis", refs: input.usage.refs }
        : undefined,
    });
    const parsed = parseAnswerAnalysisJson(text, targetNames);
    const brandsMentioned = filterBusinessBrands(parsed.brandsMentioned, [], targetNames);
    return {
      position: parsed.targetPosition,
      sentiment: parsed.sentiment,
      brandsMentioned,
    };
  } catch {
    return { position: null, sentiment: null, brandsMentioned: [] };
  }
}
