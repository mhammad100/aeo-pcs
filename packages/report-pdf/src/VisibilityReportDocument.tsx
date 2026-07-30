import React from "react";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import type {
  PresenceAudit,
  PresenceChannelAudit,
  PresenceChannelStatus,
  PromptResult,
} from "@aeo-pcs/shared";
import { presenceStatusLabel } from "@aeo-pcs/shared";
import { styles } from "./theme";
import type { VisibilityReportInput } from "./types";

function formatReportDate(date: Date): string {
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function badgeStyle(status: PresenceChannelStatus) {
  switch (status) {
    case "verified":
      return styles.badgeOk;
    case "needs_improvement":
      return styles.badgeWarn;
    case "missing":
      return styles.badgeBad;
    default:
      return styles.badgeNeutral;
  }
}

function PageFooter() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>Prepared by Master AEO · masteraeo.com</Text>
      <Text style={styles.footerText}>
        AI visibility scores vary by model, prompt wording, and timing. Use this report as a
        directional baseline and track progress month over month.
      </Text>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function PresenceChannelCard({ channel }: { channel: PresenceChannelAudit }) {
  return (
    <View style={styles.presenceCard}>
      <View style={styles.presenceHeader}>
        <Text style={styles.presenceLabel}>{channel.label}</Text>
        <Text style={[styles.badge, badgeStyle(channel.status)]}>
          {presenceStatusLabel(channel.status)}
        </Text>
      </View>
      {channel.url ? <Text style={styles.muted}>{channel.url}</Text> : null}
      <Text style={[styles.body, { marginTop: 4 }]}>{channel.summary}</Text>
      <Text style={[styles.muted, { marginTop: 4 }]}>
        Cited by AI: {channel.citedInAiAnswers ? "Yes" : "No"} · Brand mentioned:{" "}
        {channel.brandMentionedInAnswers ? "Yes" : "No"}
      </Text>
    </View>
  );
}

function PresenceSection({ audit }: { audit: PresenceAudit }) {
  return (
    <View>
      <SectionTitle>Online presence review</SectionTitle>
      <Text style={styles.lead}>
        We compared your saved profile links with what AI assistants cited during this visibility
        check.
      </Text>
      <PresenceChannelCard channel={audit.googleBusiness} />
      <PresenceChannelCard channel={audit.website} />
      {audit.social.map((s) => (
        <PresenceChannelCard key={`${s.label}-${s.url}`} channel={s} />
      ))}
      {audit.directories.length > 0 && (
        <>
          <Text style={styles.subhead}>Directories influencing AI answers</Text>
          {audit.directories.map((d) => (
            <Text key={d.domain} style={styles.bulletItem}>
              • {d.domain} — cited {d.citationCount} time{d.citationCount === 1 ? "" : "s"}.{" "}
              {d.summary}
            </Text>
          ))}
        </>
      )}
      {audit.topCompetitors.length > 0 && (
        <>
          <Text style={styles.subhead}>Businesses AI named in your category</Text>
          <Text style={styles.body}>{audit.topCompetitors.join(", ")}</Text>
        </>
      )}
    </View>
  );
}

function PromptSummaryTable({ results }: { results: PromptResult[] }) {
  return (
    <View>
      <SectionTitle>Prompt results</SectionTitle>
      <Text style={styles.lead}>
        Summary across {results.length} buyer-intent prompts checked in this run.
      </Text>
      <View style={styles.tableHeader}>
        <Text style={[styles.cellBold, styles.colPrompt]}>Prompt</Text>
        <Text style={[styles.cellBold, styles.colMentioned]}>Mentioned</Text>
        <Text style={[styles.cellBold, styles.colModels]}>Model details</Text>
      </View>
      {results.map((r, i) => {
        const anyMention = r.perModel.some((m) => m.mentioned && m.answer?.trim());
        const modelLines = r.perModel
          .filter((m) => m.answer?.trim())
          .map((m) => {
            const tags = [
              m.mentioned ? "Mentioned" : "Not mentioned",
              m.sourceMentioned ? "Source cited" : null,
              m.position != null ? `#${m.position}` : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return `${m.model}: ${tags}`;
          });

        return (
          <View key={i} style={styles.tableRow} wrap={false}>
            <Text style={[styles.cellText, styles.colPrompt]}>{r.prompt}</Text>
            <Text style={[styles.cellText, styles.colMentioned]}>
              {anyMention ? "Yes" : "No"}
            </Text>
            <View style={styles.colModels}>
              {modelLines.length ? (
                modelLines.map((line, j) => (
                  <Text key={j} style={styles.cellText}>
                    {line}
                  </Text>
                ))
              ) : (
                <Text style={styles.cellText}>—</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

function DetailedResponses({ results }: { results: PromptResult[] }) {
  return (
    <View>
      <SectionTitle>Detailed AI responses</SectionTitle>
      {results.map((r, i) => (
        <View key={i} style={styles.responseBlock}>
          <Text style={styles.responsePrompt}>{r.prompt}</Text>
          {r.perModel.map((m) => {
            if (!m.answer?.trim()) {
              return (
                <View key={m.model} style={styles.responseItem}>
                  <Text style={styles.responseMeta}>{m.model} — Response unavailable.</Text>
                </View>
              );
            }
            const meta = [
              m.model,
              m.mentioned ? "Mentioned" : "Not mentioned",
              m.sourceMentioned ? "Source cited" : null,
              m.position != null ? `#${m.position}` : null,
              m.sentiment || null,
            ]
              .filter(Boolean)
              .join(" · ");

            return (
              <View key={m.model} style={styles.responseItem}>
                <Text style={styles.responseMeta}>{meta}</Text>
                <Text style={styles.responseText}>{m.answer}</Text>
                {m.sources.length > 0 && (
                  <Text style={styles.responseSources}>
                    Sources: {m.sources.map((s) => s.domain).join(", ")}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export function VisibilityReportDocument(props: VisibilityReportInput) {
  const {
    selected,
    category,
    city,
    country,
    results,
    score,
    plan,
    itemOutputs = {},
    generatedAt = new Date(),
    jobError,
  } = props;

  const location = [city, country].filter(Boolean).join(", ");
  const businessName = selected?.name || "Business";
  const pct = score?.brandVisibilityPct ?? score?.visibilityPct ?? 0;

  const promptsWithMention =
    results?.filter((r) => r.perModel.some((m) => m.mentioned && m.answer?.trim())).length ?? 0;

  return (
    <Document title={`AI Visibility Report — ${businessName}`} author="Master AEO">
      <Page size="A4" style={styles.coverPage}>
        <Text style={styles.coverBrand}>Master AEO</Text>
        <Text style={styles.coverTitle}>AI Visibility Report</Text>
        <Text style={styles.coverBusiness}>{businessName}</Text>
        <Text style={styles.coverMeta}>
          {category || "Business"}
          {location ? ` · ${location}` : ""}
        </Text>
        <Text style={styles.coverDate}>Generated {formatReportDate(generatedAt)}</Text>
        <View style={styles.coverRule} />
      </Page>

      <Page size="A4" style={styles.page}>
        {jobError ? (
          <View style={styles.calloutWarn}>
            <Text style={styles.calloutWarnText}>{jobError}</Text>
          </View>
        ) : null}

        {results && score ? (
          <>
            <SectionTitle>Executive summary</SectionTitle>
            <View style={styles.metricsRow}>
              <View style={[styles.metricCard, styles.metricCardPrimary]}>
                <Text style={styles.metricValue}>{pct}%</Text>
                <Text style={styles.metricLabel}>Brand visibility</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>
                  {score.totalMentions}/{score.totalChecks}
                </Text>
                <Text style={styles.metricLabel}>Mentions in AI responses</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>{score.sourceVisibilityPct ?? 0}%</Text>
                <Text style={styles.metricLabel}>Source citation rate</Text>
              </View>
              <View style={styles.metricCard}>
                <Text style={styles.metricValue}>
                  {promptsWithMention}/{results.length}
                </Text>
                <Text style={styles.metricLabel}>Prompts with a mention</Text>
              </View>
            </View>
            <Text style={styles.body}>
              This report shows how often AI assistants name {businessName} when customers ask
              discovery-style questions in your category and location.{" "}
              {score.avgPosition != null
                ? `When mentioned, your average position among named businesses was #${score.avgPosition}.`
                : "Your business was not ranked in enough responses to calculate an average position."}
            </Text>
            {plan?.presenceAudit ? <PresenceSection audit={plan.presenceAudit} /> : null}
          </>
        ) : (
          <Text style={styles.body}>Visibility check results are not available for this report.</Text>
        )}
        <PageFooter />
      </Page>

      {results && score ? (
        <>
          <Page size="A4" style={styles.page}>
            <PromptSummaryTable results={results} />
            <PageFooter />
          </Page>
          <Page size="A4" style={styles.page} wrap>
            <DetailedResponses results={results} />
            <PageFooter />
          </Page>
        </>
      ) : null}

      {plan ? (
        <>
          <Page size="A4" style={styles.page} wrap>
            <SectionTitle>Recommended content</SectionTitle>
            <Text style={styles.lead}>
              Ready-to-generate copy that can improve how AI assistants describe your business.
            </Text>
            {plan.automatable.map((item) => (
              <View key={item.id} style={styles.planItem}>
                <Text style={styles.planTitle}>{item.title}</Text>
                <Text style={styles.body}>{item.description}</Text>
                {itemOutputs[item.id] ? (
                  <View style={styles.generatedBox}>
                    <Text style={styles.responseText}>{itemOutputs[item.id]}</Text>
                  </View>
                ) : (
                  <Text style={styles.muted}>Content not generated yet.</Text>
                )}
              </View>
            ))}
            <PageFooter />
          </Page>
          <Page size="A4" style={styles.page} wrap>
            <SectionTitle>Action checklist</SectionTitle>
            <Text style={styles.lead}>
              Prioritized steps based on your profile, citations, and visibility gaps.
            </Text>
            {plan.manual.map((item, i) => (
              <View key={`${i}-${item.title}`} style={styles.planItem}>
                <Text style={styles.planTitle}>
                  {i + 1}. {item.title}
                </Text>
                <Text style={styles.body}>{item.guidance}</Text>
              </View>
            ))}
            <PageFooter />
          </Page>
        </>
      ) : (
        <Page size="A4" style={styles.page}>
          <Text style={styles.body}>
            Build an action plan in Master AEO to receive prioritized recommendations.
          </Text>
          <PageFooter />
        </Page>
      )}
    </Document>
  );
}
