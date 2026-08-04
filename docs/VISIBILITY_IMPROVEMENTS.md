# Visibility improvements (Peec-style, API-only)

## Goal

Measure AI visibility more accurately without browser automation: realistic location handling,
niche/product-targeted prompts, alias-aware brand detection, source citation scoring, and
structured answer analysis.

## Phases

### Phase 1 — Profile & prompts (P0) ✅

- Required **description** (min 10 chars)
- **targetLocations** — service areas / neighborhoods (min 1; defaults to primary city)
- **targetItems** — products/services to track (min 1)
- **nameAliases** — optional alternate names for mention matching
- Prompt generation uses all profile fields; location mix (explicit, near me, need-only)
- Core prompt filtering — at least 60% must reference offerings or distinct traits
- Prior-run feedback — weak prompts + competitors inform regeneration

### Phase 2 — Visibility engine (P0) ✅

- Per-chat **user location** injection (one area per prompt; skip when prompt has explicit geo)
- **Alias-aware** brand mention detection
- **Source visibility** — business website / GBP domain cited even if name absent
- Post-answer **analysis** (position, sentiment, brands mentioned) via lightweight LLM JSON extract

### Phase 3 — Scoring & UI (P1) ✅ in progress

- Extended `VisibilityScore`: brandVisibilityPct, sourceVisibilityPct, avgPosition, sentimentScore
- **Weighted scoring**: core/niche prompts count 2×; position affects mention credit (#1 > #2 > #3)
- Results UI: brand vs source tags, position, sentiment per model answer
- Backward-compatible `visibilityPct` (= weighted brandVisibilityPct)

### Phase 4 — Later (P2)

- Competitor list + share of voice
- Stable tracked prompt library per business
- Scheduled re-runs for trends

## Atomic unit

One **chat** = one prompt × one model × one simulated user location → stored as `ModelResult` with analysis fields.
