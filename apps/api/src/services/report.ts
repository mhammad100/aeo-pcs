import type {
  ActionPlan,
  BusinessCandidate,
  PresenceAudit,
  PresenceChannelAudit,
  PresenceChannelStatus,
  PromptResult,
  VisibilityScore,
} from "@aeo-pcs/shared";
import { presenceStatusLabel } from "@aeo-pcs/shared";

function esc(s: unknown): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatReportDate(date = new Date()): string {
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function statusClass(status: PresenceChannelStatus): string {
  switch (status) {
    case "verified":
      return "status-ok";
    case "needs_improvement":
      return "status-warn";
    case "missing":
      return "status-bad";
    default:
      return "status-neutral";
  }
}

function renderPresenceRow(channel: PresenceChannelAudit): string {
  return `<tr>
    <td><strong>${esc(channel.label)}</strong>${channel.url ? `<br><span class="muted">${esc(channel.url)}</span>` : ""}</td>
    <td><span class="badge ${statusClass(channel.status)}">${esc(presenceStatusLabel(channel.status))}</span></td>
    <td>${channel.citedInAiAnswers ? "Yes" : "No"}</td>
    <td>${channel.brandMentionedInAnswers ? "Yes" : "No"}</td>
    <td class="summary-cell">${esc(channel.summary)}</td>
  </tr>`;
}

function renderPresenceSection(audit: PresenceAudit): string {
  let html = `<section class="section page-break">
    <h2>Online presence review</h2>
    <p class="lead">We compared your saved profile links with what AI assistants cited during this visibility check.</p>
    <table class="data-table">
      <thead>
        <tr>
          <th>Channel</th>
          <th>Status</th>
          <th>Cited by AI</th>
          <th>Brand mentioned</th>
          <th>Summary</th>
        </tr>
      </thead>
      <tbody>`;

  html += renderPresenceRow(audit.googleBusiness);
  html += renderPresenceRow(audit.website);
  for (const s of audit.social) {
    html += renderPresenceRow(s);
  }

  html += `</tbody></table>`;

  if (audit.directories.length) {
    html += `<h3 class="subhead">Directories influencing AI answers</h3><ul class="bullet-list">`;
    for (const d of audit.directories) {
      html += `<li><strong>${esc(d.domain)}</strong> — cited ${d.citationCount} time${d.citationCount === 1 ? "" : "s"}. ${esc(d.summary)}</li>`;
    }
    html += `</ul>`;
  }

  if (audit.topCompetitors.length) {
    html += `<h3 class="subhead">Businesses AI named in your category</h3>
    <p class="body-text">${esc(audit.topCompetitors.join(", "))}</p>`;
  }

  html += `</section>`;
  return html;
}

function summarizePromptResults(results: PromptResult[]): {
  mentioned: number;
  missed: number;
  rows: string;
} {
  let mentioned = 0;
  let missed = 0;
  let rows = "";

  for (const r of results) {
    const anyMention = r.perModel.some((m) => m.mentioned && m.answer?.trim());
    if (anyMention) mentioned += 1;
    else missed += 1;

    const models = r.perModel
      .filter((m) => m.answer?.trim())
      .map((m) => {
        const tags = [
          m.mentioned ? "Mentioned" : "Not mentioned",
          m.sourceMentioned ? "Source cited" : null,
          m.position != null ? `#${m.position}` : null,
        ]
          .filter(Boolean)
          .join(" · ");
        return `<span class="model-tag">${esc(m.model)}: ${tags}</span>`;
      })
      .join("");

    rows += `<tr>
      <td class="prompt-cell">${esc(r.prompt)}</td>
      <td>${anyMention ? '<span class="badge status-ok">Yes</span>' : '<span class="badge status-bad">No</span>'}</td>
      <td class="models-cell">${models || "—"}</td>
    </tr>`;
  }

  return { mentioned, missed, rows };
}

export function buildReportHtml(state: {
  selected: BusinessCandidate | null;
  category: string;
  city: string;
  country: string;
  results?: PromptResult[] | null;
  score?: VisibilityScore | null;
  plan?: ActionPlan | null;
  itemOutputs?: Record<string, string>;
  generatedAt?: Date;
  jobError?: string | null;
}): string {
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
  } = state;

  const location = [city, country].filter(Boolean).join(", ");
  const businessName = selected?.name || "Business";
  const pct = score?.brandVisibilityPct ?? score?.visibilityPct ?? 0;

  let html = "";

  html += `<header class="cover page-break">
    <div class="cover-brand">Master AEO</div>
    <h1 class="cover-title">AI Visibility Report</h1>
    <p class="cover-business">${esc(businessName)}</p>
    <p class="cover-meta">${esc(category || "Business")}${location ? ` · ${esc(location)}` : ""}</p>
    <p class="cover-date">Generated ${esc(formatReportDate(generatedAt))}</p>
  </header>`;

  if (jobError) {
    html += `<div class="callout callout-warn">${esc(jobError)}</div>`;
  }

  if (results && score) {
    const summary = summarizePromptResults(results);

    html += `<section class="section">
      <h2>Executive summary</h2>
      <div class="metrics">
        <div class="metric-card metric-primary">
          <div class="metric-value">${pct}%</div>
          <div class="metric-label">Brand visibility</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${score.totalMentions}/${score.totalChecks}</div>
          <div class="metric-label">Mentions in AI responses</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${score.sourceVisibilityPct ?? 0}%</div>
          <div class="metric-label">Source citation rate</div>
        </div>
        <div class="metric-card">
          <div class="metric-value">${summary.mentioned}/${results.length}</div>
          <div class="metric-label">Prompts with a mention</div>
        </div>
      </div>
      <p class="body-text">This report shows how often AI assistants name <strong>${esc(businessName)}</strong> when customers ask discovery-style questions in your category and location. ${
        score.avgPosition != null
          ? `When mentioned, your average position among named businesses was #${score.avgPosition}.`
          : "Your business was not ranked in enough responses to calculate an average position."
      }</p>
    </section>`;

    if (plan?.presenceAudit) {
      html += renderPresenceSection(plan.presenceAudit);
    }

    html += `<section class="section page-break">
      <h2>Prompt results</h2>
      <p class="lead">Summary across ${results.length} buyer-intent prompts checked in this run.</p>
      <table class="data-table">
        <thead>
          <tr>
            <th>Prompt</th>
            <th>Mentioned</th>
            <th>Model details</th>
          </tr>
        </thead>
        <tbody>${summary.rows}</tbody>
      </table>
    </section>`;

    html += `<section class="section page-break">
      <h2>Detailed AI responses</h2>`;
    results.forEach((r) => {
      html += `<article class="response-block">
        <h3 class="response-prompt">${esc(r.prompt)}</h3>`;
      r.perModel.forEach((m) => {
        if (!m.answer?.trim()) {
          html += `<div class="response-item muted"><strong>${esc(m.model)}</strong> — Response unavailable.</div>`;
          return;
        }
        html += `<div class="response-item">
          <div class="response-meta"><strong>${esc(m.model)}</strong> · ${m.mentioned ? "Mentioned" : "Not mentioned"}${m.sourceMentioned ? " · Source cited" : ""}${m.position != null ? ` · #${m.position}` : ""}${m.sentiment ? ` · ${m.sentiment}` : ""}</div>
          <p class="response-text">${esc(m.answer)}</p>`;
        if (m.sources.length) {
          html += `<p class="response-sources">Sources: ${esc(m.sources.map((s) => s.domain).join(", "))}</p>`;
        }
        html += `</div>`;
      });
      html += `</article>`;
    });
    html += `</section>`;
  } else {
    html += `<section class="section"><p class="body-text">Visibility check results are not available for this report.</p></section>`;
  }

  if (plan) {
    html += `<section class="section page-break">
      <h2>Recommended content</h2>
      <p class="lead">Ready-to-generate copy that can improve how AI assistants describe your business.</p>`;
    plan.automatable.forEach((item) => {
      html += `<div class="plan-item">
        <h3 class="plan-title">${esc(item.title)}</h3>
        <p class="body-text">${esc(item.description)}</p>`;
      if (itemOutputs[item.id]) {
        html += `<div class="generated-box">${esc(itemOutputs[item.id])}</div>`;
      } else {
        html += `<p class="muted">Content not generated yet.</p>`;
      }
      html += `</div>`;
    });
    html += `</section>`;

    html += `<section class="section page-break">
      <h2>Action checklist</h2>
      <p class="lead">Prioritized steps based on your profile, citations, and visibility gaps.</p>`;
    plan.manual.forEach((item, i) => {
      html += `<div class="plan-item">
        <h3 class="plan-title">${i + 1}. ${esc(item.title)}</h3>
        <p class="body-text">${esc(item.guidance)}</p>
      </div>`;
    });
    html += `</section>`;
  } else {
    html += `<section class="section"><p class="body-text">Build an action plan in Master AEO to receive prioritized recommendations.</p></section>`;
  }

  html += `<footer class="report-footer">
    <p>Prepared by Master AEO · masteraeo.com</p>
    <p class="muted">AI visibility scores vary by model, prompt wording, and timing. Use this report as a directional baseline and track progress month over month.</p>
  </footer>`;

  return html;
}

export const REPORT_STYLES = `
  @page { size: A4; margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", system-ui, -apple-system, Helvetica, Arial, sans-serif;
    color: #1a241f;
    font-size: 11pt;
    line-height: 1.55;
    margin: 0;
    padding: 0;
    background: #fff;
  }
  .cover {
    min-height: 240mm;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 24mm 8mm 16mm;
    border-bottom: 3px solid #1a241f;
    margin-bottom: 8mm;
  }
  .cover-brand {
    font-size: 10pt;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #55705f;
    margin-bottom: 10mm;
  }
  .cover-title {
    font-size: 32pt;
    font-weight: 700;
    margin: 0 0 6mm;
    line-height: 1.15;
  }
  .cover-business {
    font-size: 18pt;
    font-weight: 600;
    margin: 0 0 3mm;
    color: #2c3630;
  }
  .cover-meta, .cover-date {
    margin: 0;
    color: #4a5750;
    font-size: 11pt;
  }
  .cover-date { margin-top: 4mm; color: #7a8a80; }
  .section { padding: 0 2mm 10mm; }
  .page-break { page-break-before: always; }
  h2 {
    font-size: 14pt;
    font-weight: 700;
    margin: 0 0 4mm;
    color: #1a241f;
    border-bottom: 1px solid #d8d3c4;
    padding-bottom: 2mm;
  }
  h3.subhead {
    font-size: 11pt;
    margin: 6mm 0 2mm;
    color: #2c3630;
  }
  .lead { color: #4a5750; margin: 0 0 5mm; }
  .body-text { margin: 0 0 4mm; color: #2c3630; }
  .muted { color: #7a8a80; font-size: 10pt; }
  .metrics {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4mm;
    margin-bottom: 6mm;
  }
  .metric-card {
    border: 1px solid #d8d3c4;
    border-radius: 4px;
    padding: 4mm;
    background: #faf9f6;
  }
  .metric-primary {
    background: #eef4ef;
    border-color: #8fbf9f;
  }
  .metric-value {
    font-size: 18pt;
    font-weight: 700;
    line-height: 1.1;
    color: #1a241f;
  }
  .metric-label {
    font-size: 9pt;
    color: #55705f;
    margin-top: 2mm;
  }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9.5pt;
    margin-bottom: 4mm;
  }
  .data-table th, .data-table td {
    border: 1px solid #e4e0d6;
    padding: 2.5mm 3mm;
    vertical-align: top;
    text-align: left;
  }
  .data-table th {
    background: #f4f1ea;
    font-weight: 600;
    color: #1a241f;
  }
  .prompt-cell { max-width: 45%; }
  .summary-cell { min-width: 28%; }
  .models-cell .model-tag {
    display: block;
    margin-bottom: 1mm;
    font-size: 9pt;
    color: #4a5750;
  }
  .badge {
    display: inline-block;
    padding: 1mm 2.5mm;
    border-radius: 3px;
    font-size: 8.5pt;
    font-weight: 600;
    white-space: nowrap;
  }
  .status-ok { background: #e6f2ea; color: #2d6a4f; }
  .status-warn { background: #faf0e4; color: #9a5b1a; }
  .status-bad { background: #fdecea; color: #b42318; }
  .status-neutral { background: #f0f0f0; color: #555; }
  .bullet-list { margin: 0; padding-left: 5mm; }
  .bullet-list li { margin-bottom: 2mm; }
  .callout {
    padding: 4mm;
    border-radius: 4px;
    margin: 0 2mm 6mm;
    font-size: 10pt;
  }
  .callout-warn {
    background: #faf0e4;
    border: 1px solid #e8c89a;
    color: #7a4a12;
  }
  .response-block {
    margin-bottom: 6mm;
    page-break-inside: avoid;
  }
  .response-prompt {
    font-size: 11pt;
    margin: 0 0 3mm;
    color: #1a241f;
  }
  .response-item {
    margin-bottom: 4mm;
    padding-left: 3mm;
    border-left: 2px solid #d8d3c4;
  }
  .response-meta {
    font-size: 9pt;
    color: #55705f;
    margin-bottom: 1mm;
  }
  .response-text {
    margin: 0;
    font-size: 10pt;
    color: #2c3630;
  }
  .response-sources {
    margin: 1mm 0 0;
    font-size: 9pt;
    color: #7a8a80;
  }
  .plan-item {
    margin-bottom: 5mm;
    page-break-inside: avoid;
  }
  .plan-title {
    font-size: 11pt;
    margin: 0 0 2mm;
    color: #1a241f;
  }
  .generated-box {
    background: #f4f1ea;
    border: 1px solid #e4e0d6;
    border-radius: 4px;
    padding: 3mm;
    white-space: pre-wrap;
    font-size: 10pt;
    margin-top: 2mm;
  }
  .report-footer {
    margin-top: 10mm;
    padding-top: 4mm;
    border-top: 1px solid #d8d3c4;
    font-size: 9pt;
    color: #7a8a80;
  }
`;

export function wrapReportDocument(bodyHtml: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>AI Visibility Report · Master AEO</title><style>${REPORT_STYLES}</style></head><body>${bodyHtml}</body></html>`;
}
