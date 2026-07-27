import React, { useState } from "react";

const CATEGORIES = [
  "Restaurant / Food & Beverage",
  "Retail / Fashion & Apparel",
  "Ayurveda / Wellness & Clinic",
  "Manufacturer / Industrial Supplier",
  "Real Estate / Builder",
  "Education / Coaching Institute",
  "Salon / Spa / Beauty",
  "Hospital / Healthcare",
  "Hotel / Hospitality",
  "IT / Software Services",
  "Jewellery",
  "Automobile / Auto Parts",
  "Other",
];

const MODELS = ["ChatGPT-style", "Gemini-style", "Perplexity-style"];

const NO_MARKDOWN_RULE =
  "Write in plain prose sentences and short paragraphs only. Never use markdown formatting of any kind: no hashes, no asterisks, no bullet dashes, no numbered list markers, no bold or italic symbols. If you need to separate items, use a new line and a short label followed by a colon, written as plain text.";

async function callClaude({ prompt, system, useWebSearch }) {
  const body = {
    model: "claude-sonnet-4-6",
    max_tokens: 1200,
    system,
    messages: [{ role: "user", content: prompt }],
  };
  if (useWebSearch) {
    body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  }
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  const content = data.content || [];
  const text = content.filter((b) => b.type === "text").map((b) => b.text).join("\n");
  const sources = [];
  content
    .filter((b) => b.type === "web_search_tool_result")
    .forEach((b) => {
      const items = Array.isArray(b.content) ? b.content : [];
      items.forEach((it) => {
        if (it.url) {
          try {
            const domain = new URL(it.url).hostname.replace(/^www\./, "");
            sources.push({ domain, url: it.url, title: it.title || domain });
          } catch (e) {}
        }
      });
    });
  return { text, sources };
}

function safeParseJSON(text) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const match = cleaned.match(/[\[{][\s\S]*[\]}]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e2) {
        return null;
      }
    }
    return null;
  }
}

function extractMentioned(answerText, brandName) {
  const re = new RegExp(brandName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
  return re.test(answerText);
}

function dedupeSources(sources) {
  const seen = new Map();
  sources.forEach((s) => {
    if (!seen.has(s.domain)) seen.set(s.domain, s);
  });
  return Array.from(seen.values());
}

function buildReportHtml({ selected, category, city, results, visibilityPct, totalMentions, totalChecks, plan, itemOutputs }) {
  const esc = (s) =>
    String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  let html = "";
  html += `<div class="rpt-header">`;
  html += `<div class="rpt-eyebrow">AI Visibility Report</div>`;
  html += `<div class="rpt-title">${esc(selected ? selected.name : "Untitled business")}</div>`;
  html += `<div class="rpt-sub">${esc(category || "")}${category && city ? ", " : ""}${esc(city || "")}</div>`;
  html += `<div class="rpt-brand">Pal Consultancy Services, PCS Solution</div>`;
  html += `</div>`;

  if (results) {
    html += `<div class="rpt-section">`;
    html += `<div class="rpt-h2">Visibility score</div>`;
    html += `<div class="rpt-score">${visibilityPct}%</div>`;
    html += `<div class="rpt-text">Mentioned in ${totalMentions} of ${totalChecks} model responses across ${results.length} prompts.</div>`;
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

function downloadReport(state) {
  const bodyHtml = buildReportHtml(state);
  const fullHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>AI Visibility Report</title><style>
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

  const blob = new Blob([fullHtml], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const nameSafe = (state.selected ? state.selected.name : "report").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const a = document.createElement("a");
  a.href = url;
  a.download = `ai-visibility-report-${nameSafe}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function App() {
  const [nameQuery, setNameQuery] = useState("");
  const [city, setCity] = useState("Ahmedabad");
  const [searching, setSearching] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [category, setCategory] = useState("");
  const [prompts, setPrompts] = useState([]);
  const [generatingPrompts, setGeneratingPrompts] = useState(false);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const [plan, setPlan] = useState(null);
  const [buildingPlan, setBuildingPlan] = useState(false);
  const [itemOutputs, setItemOutputs] = useState({});
  const [generatingItem, setGeneratingItem] = useState(null);

  function resetDownstream() {
    setResults(null);
    setPlan(null);
    setItemOutputs({});
  }

  async function searchBusiness() {
    if (!nameQuery.trim()) return;
    setSearching(true);
    setError(null);
    setCandidates([]);
    setSelected(null);
    resetDownstream();
    try {
      const system = `You help find real businesses using web search. Search the web for the business the user names, in the given city. Return ONLY a JSON array (no prose, no markdown fences) of up to 4 candidate matches, each with fields: name, category, address, description.`;
      const userMsg = `Business name: "${nameQuery}", City: "${city}"`;
      const { text } = await callClaude({ prompt: userMsg, system, useWebSearch: true });
      const parsed = safeParseJSON(text);
      if (parsed && Array.isArray(parsed) && parsed.length) {
        setCandidates(parsed);
      } else {
        setCandidates([{ name: nameQuery, category: "Other", address: city, description: "No verified match found, proceeding with entered name." }]);
      }
    } catch (e) {
      setError("Business search failed: " + e.message);
    } finally {
      setSearching(false);
    }
  }

  function pickCandidate(c) {
    setSelected(c);
    const matchedCategory = CATEGORIES.find(
      (cat) => c.category && cat.toLowerCase().includes(c.category.toLowerCase().split(" ")[0])
    );
    setCategory(matchedCategory || "Other");
    setPrompts([]);
    resetDownstream();
  }

  async function generatePrompts() {
    if (!selected) return;
    setGeneratingPrompts(true);
    setError(null);
    try {
      const system = `You generate realistic buyer-intent questions that potential customers would type into an AI assistant when looking for a business like this, not naming the business itself. Return ONLY a JSON array of exactly 5 short question strings, no markdown, no prose.`;
      const userMsg = `Business: ${selected.name}\nCategory: ${category}\nCity: ${city}\nDescription: ${selected.description || ""}`;
      const { text } = await callClaude({ prompt: userMsg, system, useWebSearch: false });
      const parsed = safeParseJSON(text);
      if (parsed && Array.isArray(parsed) && parsed.length) {
        setPrompts(parsed.slice(0, 5));
      } else {
        setError("Couldn't auto-generate prompts, try again.");
      }
    } catch (e) {
      setError("Prompt generation failed: " + e.message);
    } finally {
      setGeneratingPrompts(false);
    }
  }

  function updatePrompt(i, val) {
    const next = [...prompts];
    next[i] = val;
    setPrompts(next);
  }

  async function runCheck() {
    if (!selected || !prompts.length) return;
    setRunning(true);
    setError(null);
    setResults(null);
    setPlan(null);
    setItemOutputs({});
    try {
      const allResults = [];
      for (const prompt of prompts) {
        const perModel = [];
        for (const model of MODELS) {
          const system = `You are simulating how a ${model} AI assistant answers a real user's question, grounded in actual current web search results. Search the web, then answer naturally as that assistant would, naming specific real businesses relevant to the query and location. Keep it to 4-6 sentences and name at least 2-3 businesses if the search results support it. ${NO_MARKDOWN_RULE}`;
          const { text, sources } = await callClaude({ prompt, system, useWebSearch: true });
          const mentioned = extractMentioned(text, selected.name);
          perModel.push({ model, answer: text, mentioned, sources: dedupeSources(sources) });
        }
        allResults.push({ prompt, perModel });
      }
      setResults(allResults);
    } catch (e) {
      setError("Visibility check failed: " + e.message);
    } finally {
      setRunning(false);
    }
  }

  async function buildActionPlan() {
    if (!results) return;
    setBuildingPlan(true);
    setError(null);
    setPlan(null);
    setItemOutputs({});
    try {
      const allSourceDomains = dedupeSources(results.flatMap((r) => r.perModel.flatMap((m) => m.sources)))
        .slice(0, 12)
        .map((s) => s.domain)
        .join(", ");

      const competitorContext = results
        .map((r) => `Prompt: ${r.prompt}\n` + r.perModel.map((m) => `${m.model}: ${m.answer}`).join("\n"))
        .join("\n\n");

      const system = `You are an AI visibility consultant. Analyze why the business "${selected.name}" (${category}, ${city}) is or isn't appearing in AI assistant answers, given the domains currently getting cited and the model answers below. Produce ONLY a JSON object with two arrays: automatable and manual. Each item in automatable is content or copy this tool can generate right now for the business owner, with fields id (short slug), title (short action label, plain text, five words max), description (one plain sentence explaining what it produces). Include 3 to 5 automatable items such as an FAQ content block, a comparison paragraph, a Google Business Profile description, a structured data snippet description, or short-form answer content for forums. Each item in manual is a real-world action the business owner must do themselves that this tool cannot do for them, with fields title (short action label, five words max) and guidance (two to three plain sentences explaining exactly what to do and why it helps AI visibility, no markdown). Include 3 to 5 manual items such as claiming or updating a Google Business Profile, getting listed on specific relevant directories, earning reviews on Google or industry-specific platforms, getting mentioned in local press or blogs, or building presence on forums like Reddit or Quora where AI models pull citations from. Return valid JSON only, no markdown fences, no extra text.`;

      const userMsg = `Domains currently cited by AI models instead of this business: ${allSourceDomains || "none captured"}\n\nContext from AI answers:\n${competitorContext}`;

      const { text } = await callClaude({ prompt: userMsg, system, useWebSearch: false });
      const parsed = safeParseJSON(text);
      if (parsed && parsed.automatable && parsed.manual) {
        setPlan(parsed);
      } else {
        setError("Couldn't build the action plan, try again.");
      }
    } catch (e) {
      setError("Action plan failed: " + e.message);
    } finally {
      setBuildingPlan(false);
    }
  }

  async function generateItemContent(item) {
    setGeneratingItem(item.id);
    setError(null);
    try {
      const system = `You are a GEO content writer producing one specific piece of ready-to-publish content for a small business, so an AI assistant is more likely to cite them. ${NO_MARKDOWN_RULE} Keep the output focused and directly usable, roughly 120 to 220 words unless the task clearly needs more.`;
      const userMsg = `Business: ${selected.name}, ${category}, ${city}\nDescription: ${selected.description || ""}\n\nTask: ${item.title}\nDetail: ${item.description}\n\nWrite the actual content now, ready to copy and publish.`;
      const { text } = await callClaude({ prompt: userMsg, system, useWebSearch: false });
      setItemOutputs((prev) => ({ ...prev, [item.id]: text }));
    } catch (e) {
      setError("Couldn't generate that item: " + e.message);
    } finally {
      setGeneratingItem(null);
    }
  }

  const totalChecks = results ? results.length * MODELS.length : 0;
  const totalMentions = results ? results.reduce((sum, r) => sum + r.perModel.filter((m) => m.mentioned).length, 0) : 0;
  const visibilityPct = totalChecks ? Math.round((totalMentions / totalChecks) * 100) : null;

  return (
    <div style={{ minHeight: "100vh", background: "#0F1A17", color: "#EDEAE1", fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 24px 80px" }}>
        <header style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 13, letterSpacing: "0.12em", textTransform: "uppercase", color: "#8FBF9F", marginBottom: 8 }}>
            AI Visibility and Fix It
          </div>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: 32, fontWeight: 700, margin: 0, lineHeight: 1.15 }}>
            Find your business, check your AI visibility, get a plan.
          </h1>
          <div style={{ fontSize: 12.5, color: "#8FA098", marginTop: 14 }}>
            Built by Pal Consultancy Services
          </div>
          <button
            onClick={() =>
              downloadReport({
                selected,
                category,
                city,
                results,
                visibilityPct,
                totalMentions,
                totalChecks,
                plan,
                itemOutputs,
              })
            }
            disabled={!selected}
            style={{ ...btnSecondary, marginTop: 18 }}
          >
            Download report
          </button>
        </header>

        <section style={{ marginBottom: 28, background: "#152420", borderRadius: 10, padding: 20 }}>
          <div style={{ fontSize: 12, color: "#8FBF9F", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
            Step 1. Find your business
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: 10 }}>
            <input value={nameQuery} onChange={(e) => setNameQuery(e.target.value)} placeholder="Type business name" style={inputStyle} onKeyDown={(e) => e.key === "Enter" && searchBusiness()} />
            <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" style={inputStyle} />
            <button onClick={searchBusiness} disabled={searching} style={btnPrimary}>
              {searching ? "Searching" : "Search"}
            </button>
          </div>

          {candidates.length > 0 && (
            <div style={{ marginTop: 14 }}>
              {candidates.map((c, i) => (
                <div
                  key={i}
                  onClick={() => pickCandidate(c)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    marginBottom: 6,
                    cursor: "pointer",
                    background: selected && selected.name === c.name ? "#C9773D22" : "#0F1A17",
                    border: selected && selected.name === c.name ? "1px solid #C9773D" : "1px solid #2B3B34",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: "#B9C4BC" }}>{c.category} in {c.address}</div>
                  {c.description && <div style={{ fontSize: 12, color: "#8FA098", marginTop: 2 }}>{c.description}</div>}
                </div>
              ))}
            </div>
          )}
        </section>

        {selected && (
          <section style={{ marginBottom: 28, background: "#152420", borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 12, color: "#8FBF9F", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Step 2. Confirm category and generate prompts
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: prompts.length ? 16 : 0 }}>
              <select value={category} onChange={(e) => setCategory(e.target.value)} style={inputStyle}>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <button onClick={generatePrompts} disabled={generatingPrompts} style={btnPrimary}>
                {generatingPrompts ? "Generating" : "Generate 5 prompts"}
              </button>
            </div>

            {prompts.length > 0 && (
              <div>
                {prompts.map((p, i) => (
                  <input key={i} value={p} onChange={(e) => updatePrompt(i, e.target.value)} style={{ ...inputStyle, marginBottom: 8 }} />
                ))}
                <button onClick={runCheck} disabled={running} style={{ ...btnPrimary, marginTop: 6 }}>
                  {running ? "Running visibility check" : "Run visibility check"}
                </button>
              </div>
            )}
          </section>
        )}

        {error && (
          <div style={{ background: "#4A2020", padding: 14, borderRadius: 8, marginBottom: 20, color: "#F3C6C6" }}>{error}</div>
        )}

        {results && (
          <section style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20, borderBottom: "1px solid #2B3B34", paddingBottom: 16 }}>
              <div style={{ fontSize: 40, fontWeight: 700, fontFamily: "Georgia, serif", color: visibilityPct >= 50 ? "#8FBF9F" : "#E8967A" }}>
                {visibilityPct}%
              </div>
              <div style={{ color: "#B9C4BC", fontSize: 14 }}>
                AI visibility score. {selected.name} was mentioned in {totalMentions} of {totalChecks} model responses across {results.length} prompts.
              </div>
            </div>

            {results.map((r, i) => (
              <div key={i} style={{ marginBottom: 24, background: "#152420", borderRadius: 10, padding: 18 }}>
                <div style={{ fontWeight: 600, marginBottom: 10 }}>{r.prompt}</div>
                {r.perModel.map((m) => (
                  <div key={m.model} style={{ marginBottom: 12, paddingLeft: 12, borderLeft: `3px solid ${m.mentioned ? "#8FBF9F" : "#5C4A45"}` }}>
                    <div style={{ fontSize: 12, color: m.mentioned ? "#8FBF9F" : "#E8967A", marginBottom: 4 }}>
                      {m.model}, {m.mentioned ? "mentioned" : "not mentioned"}
                    </div>
                    <div style={{ fontSize: 13.5, color: "#D7DED9", lineHeight: 1.5, marginBottom: 6 }}>{m.answer}</div>
                    {m.sources.length > 0 && (
                      <div style={{ fontSize: 11.5, color: "#8FA098" }}>Sources cited: {m.sources.map((s) => s.domain).join(", ")}</div>
                    )}
                  </div>
                ))}
              </div>
            ))}

            {!plan && (
              <button onClick={buildActionPlan} disabled={buildingPlan} style={btnSecondary}>
                {buildingPlan ? "Building action plan" : "Build action plan"}
              </button>
            )}
          </section>
        )}

        {plan && (
          <section style={{ marginBottom: 32 }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "#8FBF9F", marginBottom: 6 }}>
                Ready made solutions
              </div>
              <div style={{ fontSize: 13, color: "#8FA098", marginBottom: 14 }}>
                This tool can generate these for you right now. Press generate, then copy the result onto your website or listings.
              </div>
              {plan.automatable.map((item) => (
                <div key={item.id} style={{ background: "#152420", borderRadius: 10, padding: 16, marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{item.title}</div>
                      <div style={{ fontSize: 12.5, color: "#B9C4BC", marginTop: 2 }}>{item.description}</div>
                    </div>
                    <button onClick={() => generateItemContent(item)} disabled={generatingItem === item.id} style={btnPrimary}>
                      {generatingItem === item.id ? "Generating" : itemOutputs[item.id] ? "Regenerate" : "Generate"}
                    </button>
                  </div>
                  {itemOutputs[item.id] && (
                    <div style={{ marginTop: 12, background: "#0F1A17", borderRadius: 8, padding: 14, fontSize: 13.5, lineHeight: 1.6, whiteSpace: "pre-wrap", color: "#D7DED9" }}>
                      {itemOutputs[item.id]}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div>
              <div style={{ fontSize: 13, letterSpacing: "0.08em", textTransform: "uppercase", color: "#C9773D", marginBottom: 6 }}>
                Needs your action
              </div>
              <div style={{ fontSize: 13, color: "#8FA098", marginBottom: 14 }}>
                These need a human step, a login, or a real-world action this tool cannot take on your behalf.
              </div>
              {plan.manual.map((item, i) => (
                <div key={i} style={{ background: "#152420", borderRadius: 10, padding: 16, marginBottom: 12 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>{item.title}</div>
                  <div style={{ fontSize: 13, color: "#B9C4BC", lineHeight: 1.5 }}>{item.guidance}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer style={{ marginTop: 48, paddingTop: 20, borderTop: "1px solid #2B3B34", fontSize: 12, color: "#5C6E64" }}>
          Pal Consultancy Services, PCS Solution
        </footer>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  background: "#0F1A17",
  border: "1px solid #2B3B34",
  borderRadius: 6,
  padding: "10px 12px",
  color: "#EDEAE1",
  fontSize: 14,
  boxSizing: "border-box",
};

const btnPrimary = {
  background: "#C9773D",
  color: "#0F1A17",
  border: "none",
  padding: "10px 18px",
  borderRadius: 6,
  fontWeight: 700,
  cursor: "pointer",
  fontSize: 14,
};

const btnSecondary = {
  background: "transparent",
  color: "#8FBF9F",
  border: "1px solid #8FBF9F",
  padding: "12px 22px",
  borderRadius: 8,
  fontWeight: 600,
  cursor: "pointer",
};
