"use client";

import { useMemo } from "react";
import { Typography } from "antd";
import PromptScoreList from "@/components/PromptScoreList";
import {
  computeVisibilityRunInsights,
  type PromptContext,
  type PromptResult,
  type VisibilityScore,
} from "@aeo-pcs/shared";

const { Text, Paragraph } = Typography;

type Props = {
  results: PromptResult[];
  score: VisibilityScore;
  businessName?: string;
  nameAliases?: string[];
  promptContext?: PromptContext;
};

function pctClass(pct: number) {
  if (pct >= 50) return "is-good";
  if (pct >= 25) return "is-mid";
  return "is-low";
}

export default function VisibilityInsights({
  results,
  score,
  businessName,
  nameAliases,
  promptContext,
}: Props) {
  const ownNames = useMemo(() => {
    const names = [businessName?.trim() || "", ...(nameAliases || [])].filter(Boolean);
    return names;
  }, [businessName, nameAliases]);

  const insights = useMemo(
    () => computeVisibilityRunInsights(results, score, ownNames, promptContext),
    [results, score, ownNames, promptContext]
  );

  const brandPct = score.brandVisibilityPct ?? score.visibilityPct;
  const showCoreScore =
    insights.coreScore &&
    insights.coreScore.promptCount > 0 &&
    insights.coreScore.visibilityPct !== brandPct;

  return (
    <div className="vis-insights">
      <div className="vis-insights-hero">
        <div className={`vis-score-value ${pctClass(brandPct)}`}>{brandPct}%</div>
        <div>
          <Text style={{ color: "#EDEFF6", fontSize: 16, fontWeight: 600 }}>
            Visibility index
          </Text>
          <Paragraph type="secondary" style={{ marginBottom: 0, maxWidth: 480 }}>
            {insights.summaryLine} Mentioned in {score.totalMentions} of {score.totalChecks}{" "}
            AI responses.
          </Paragraph>
          {showCoreScore && insights.coreScore && (
            <Paragraph type="secondary" style={{ marginBottom: 0, marginTop: 8, maxWidth: 480 }}>
              On {insights.coreScore.promptCount} niche searches aligned with your profile:{" "}
              <Text style={{ color: "#EDEFF6" }}>{insights.coreScore.visibilityPct}%</Text> (
              {insights.coreScore.totalMentions}/{insights.coreScore.totalChecks} mentions).
            </Paragraph>
          )}
        </div>
      </div>

      <div className="vis-insights-metrics">
        <div className="vis-insight-metric">
          <span className="vis-insight-metric-label">Source cited</span>
          <span className="vis-insight-metric-value">{score.sourceVisibilityPct}%</span>
          <span className="vis-insight-metric-hint">
            {score.totalSourceMentions} of {score.totalChecks} answers
          </span>
        </div>
        <div className="vis-insight-metric">
          <span className="vis-insight-metric-label">Avg rank</span>
          <span className="vis-insight-metric-value">
            {score.avgPosition != null ? `#${score.avgPosition}` : "—"}
          </span>
          <span className="vis-insight-metric-hint">When your brand is named</span>
        </div>
        <div className="vis-insight-metric">
          <span className="vis-insight-metric-label">Sentiment</span>
          <span className="vis-insight-metric-value">{insights.sentimentLabel ?? "—"}</span>
          <span className="vis-insight-metric-hint">Tone in mentions</span>
        </div>
      </div>

      {insights.modelBreakdown.length > 0 && (
        <section className="vis-insight-section">
          <h4>By AI assistant</h4>
          <div className="vis-insight-chips">
            {insights.modelBreakdown.map((m) => (
              <div key={m.model} className="vis-insight-chip">
                <span className="vis-insight-chip-title">{m.model}</span>
                <span className={`vis-insight-chip-pct ${pctClass(m.pct)}`}>{m.pct}%</span>
                <span className="vis-insight-chip-sub">
                  {m.mentions}/{m.total} mentions
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {insights.weakPrompts.length > 0 && (
        <section className="vis-insight-section">
          <h4>
            Where you&apos;re missing visibility
            <span className="vis-insight-section-meta">
              {insights.weakPrompts.length} of {insights.allPrompts.length}
            </span>
          </h4>
          <PromptScoreList items={insights.weakPrompts} variant="weak" />
        </section>
      )}

      {insights.strongPrompts.length > 0 && (
        <section className="vis-insight-section">
          <h4>
            Where AI mentions you
            <span className="vis-insight-section-meta">
              {insights.strongPrompts.length} of {insights.allPrompts.length}
            </span>
          </h4>
          <PromptScoreList items={insights.strongPrompts} variant="strong" />
        </section>
      )}

      {insights.topCompetitors.length > 0 && (
        <section className="vis-insight-section">
          <h4>Other local businesses AI mentioned</h4>
          <div className="vis-insight-tags">
            {insights.topCompetitors.map((c) => (
              <span key={c.name} className="vis-insight-tag">
                {c.name}
                <span className="vis-insight-tag-count">{c.count}</span>
              </span>
            ))}
          </div>
        </section>
      )}

      {insights.topSourceDomains.length > 0 && (
        <section className="vis-insight-section">
          <h4>Top cited sources</h4>
          <div className="vis-insight-tags">
            {insights.topSourceDomains.map((d) => (
              <span key={d.name} className="vis-insight-tag is-muted">
                {d.name}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
