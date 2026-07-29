# Visibility improvements (Peec-style, API-only)

## Goal

Measure AI visibility more accurately without browser automation: local/product-targeted prompts,
alias-aware brand detection, source citation scoring, and structured answer analysis.

## Phases

### Phase 1 — Profile & prompts (P0) ✅ in progress

- Required **description** (min 10 chars)
- **targetLocations** — service areas / neighborhoods (min 1; defaults to primary city)
- **targetItems** — products/services to track (min 1)
- **nameAliases** — optional alternate names for mention matching
- Prompt generation uses all profile fields; prompts must include city + at least one target item

### Phase 2 — Visibility engine (P0)

- Inject **location + category** into every visibility query (not only the buyer prompt)
- **Alias-aware** brand mention detection
- **Source visibility** — business website / GBP domain cited even if name absent
- Post-answer **analysis** (position, sentiment, brands mentioned) via lightweight LLM JSON extract

### Phase 3 — Scoring & UI (P1)

- Extended `VisibilityScore`: brandVisibilityPct, sourceVisibilityPct, avgPosition, sentimentScore
- Results UI: brand vs source tags, position, sentiment per model answer
- Backward-compatible `visibilityPct` (= brandVisibilityPct)

### Phase 4 — Later (P2)

- Competitor list + share of voice
- Stable tracked prompt library per business
- Composite visibility index
- Scheduled re-runs for trends

## Atomic unit

One **chat** = one prompt × one model × one run → stored as `ModelResult` with analysis fields.
