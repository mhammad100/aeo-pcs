import type {
  ActionPlan,
  BusinessCandidate,
  PromptResult,
  VisibilityScore,
} from "@aeo-pcs/shared";

function esc(s: unknown): string {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
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
}): string {
  const { selected, category, city, country, results, score, plan, itemOutputs = {} } = state;

  const location = [city, country].filter(Boolean).join(", ");

  let html = "";
  html += `<div class="rpt-header">`;
  html += `<div class="rpt-eyebrow">AI Visibility Report · Master AEO</div>`;
  html += `<div class="rpt-title">${esc(selected ? selected.name : "Untitled business")}</div>`;
  html += `<div class="rpt-sub">${esc(category || "")}${category && location ? ", " : ""}${esc(location)}</div>`;
  html += `<div class="rpt-brand">Master AEO</div>`;
  html += `</div>`;

  if (results && score) {
    html += `<div class="rpt-section">`;
    html += `<div class="rpt-h2">Visibility score</div>`;
    html += `<div class="rpt-score">${score.visibilityPct}%</div>`;
    html += `<div class="rpt-text">Mentioned in ${score.totalMentions} of ${score.totalChecks} model responses across ${results.length} prompts.</div>`;
    html += `</div>`;

    html += `<div class="rpt-section">`;
    html += `<div class="rpt-h2">Prompt by prompt findings</div>`;
    results.forEach((r) => {
      html += `<div class="rpt-prompt">${esc(r.prompt)}</div>`;
      r.perModel.forEach((m) => {
        html += `<div class="rpt-model">${esc(m.model)}, ${m.mentioned ? "mentioned" : "not mentioned"}</div>`;
        html += `<div class="rpt-text">${esc(m.answer)}</div>`;
        if (m.sources.length) {
          html += `<div class="rpt-sources">Sources cited: ${esc(m.sources.map((s) => s.domain).join(", "))}</div>`;
        }
      });
    });
    html += `</div>`;
  } else {
    html += `<div class="rpt-section"><div class="rpt-text">Visibility check not yet run.</div></div>`;
  }

  if (plan) {
    html += `<div class="rpt-section">`;
    html += `<div class="rpt-h2">Ready made solutions</div>`;
    plan.automatable.forEach((item) => {
      html += `<div class="rpt-item-title">${esc(item.title)}</div>`;
      html += `<div class="rpt-text">${esc(item.description)}</div>`;
      if (itemOutputs[item.id]) {
        html += `<div class="rpt-generated">${esc(itemOutputs[item.id])}</div>`;
      } else {
        html += `<div class="rpt-pending">Pending, not generated yet.</div>`;
      }
    });
    html += `</div>`;

    html += `<div class="rpt-section">`;
    html += `<div class="rpt-h2">Needs your action</div>`;
    plan.manual.forEach((item) => {
      html += `<div class="rpt-item-title">${esc(item.title)}</div>`;
      html += `<div class="rpt-text">${esc(item.guidance)}</div>`;
    });
    html += `</div>`;
  } else {
    html += `<div class="rpt-section"><div class="rpt-text">Action plan not yet built.</div></div>`;
  }

  return html;
}

export function wrapReportDocument(bodyHtml: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>AI Visibility Report · Master AEO</title><style>
    body { font-family: Georgia, serif; color: #1A241F; padding: 40px; max-width: 720px; margin: 0 auto; background: #FFFFFF; }
    .rpt-header { border-bottom: 2px solid #1A241F; padding-bottom: 16px; margin-bottom: 24px; }
    .rpt-eyebrow { font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; color: #55705F; margin-bottom: 6px; }
    .rpt-title { font-size: 26px; font-weight: 700; }
    .rpt-sub { font-size: 14px; color: #4A5750; margin-top: 4px; }
    .rpt-brand { font-size: 12px; color: #8A9990; margin-top: 10px; }
    .rpt-section { margin-bottom: 28px; }
    .rpt-h2 { font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #1A241F; margin-bottom: 10px; border-bottom: 1px solid #D8D3C4; padding-bottom: 6px; }
    .rpt-score { font-size: 34px; font-weight: 700; }
    .rpt-text { font-size: 13.5px; line-height: 1.6; color: #2C3630; margin-bottom: 8px; }
    .rpt-prompt { font-size: 14px; font-weight: 700; margin-top: 16px; margin-bottom: 6px; }
    .rpt-model { font-size: 12px; font-weight: 700; color: #55705F; margin-top: 8px; }
    .rpt-sources { font-size: 11.5px; color: #7A8A80; margin-bottom: 6px; }
    .rpt-item-title { font-size: 14px; font-weight: 700; margin-top: 14px; }
    .rpt-generated { font-size: 13px; line-height: 1.6; background: #F4F1EA; padding: 12px; border-radius: 4px; margin-top: 6px; white-space: pre-wrap; }
    .rpt-pending { font-size: 12.5px; color: #A0785A; font-style: italic; margin-top: 4px; }
    .rpt-note { font-size: 11.5px; color: #8A9990; margin-bottom: 20px; }
  </style></head><body>
    <div class="rpt-note">Open this file in your browser, then use its print option and choose Save as PDF to get a PDF copy.</div>
    ${bodyHtml}
  </body></html>`;
}
