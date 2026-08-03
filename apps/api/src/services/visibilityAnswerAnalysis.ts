import type { MentionSentiment } from "@aeo-pcs/shared";
import { filterLocalBusinesses } from "@aeo-pcs/shared";
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
  citedDomains?: string[];
  usage?: { userId?: string | null; businessId?: string | null; refs?: Record<string, unknown> };
}): Promise<{
  position: number | null;
  sentiment: MentionSentiment | null;
  brandsMentioned: string[];
}> {
  const targetNames = collectMentionNames(input.business);
  const citedDomains = (input.citedDomains || []).map((d) => d.trim()).filter(Boolean);

  if (!input.answer.trim() || !targetNames.length) {
    return { position: null, sentiment: null, brandsMentioned: [] };
  }

  const settings = await getAeoSettings();
  const model = settings.promptGenerationModel;
  if (model.enabled === false) {
    return { position: null, sentiment: null, brandsMentioned: [] };
  }

  const system = `You analyze AI assistant answers for brand visibility research. Return ONLY a JSON object with:
- localBusinessesMentioned: array of LOCAL BUSINESS names explicitly recommended or named, in order of appearance. Include only establishments a customer could visit or hire (restaurants, cafés, shops, clinics, salons, hotels, service providers, etc.)
- targetPosition: 1-based index of the target business in localBusinessesMentioned, or null if not listed
- sentiment: "positive", "neutral", or "negative" for how the target business is described (null if not mentioned)

Do NOT include in localBusinessesMentioned:
- The target business or any of its aliases (listed below)
- Business directories or listing sites
- Review aggregators or local search portals
- Delivery or marketplace apps
- Social networks or messaging platforms
- Search engines or map providers
- News sites, blogs, forums, or media outlets
- Any platform that lists or ranks businesses rather than being a business itself

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
    const brandsMentioned = filterLocalBusinesses(
      parsed.brandsMentioned,
      citedDomains,
      targetNames
    );
    return {
      position: parsed.targetPosition,
      sentiment: parsed.sentiment,
      brandsMentioned,
    };
  } catch {
    return { position: null, sentiment: null, brandsMentioned: [] };
  }
}
