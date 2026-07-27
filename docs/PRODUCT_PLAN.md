# Master AEO — Product & Delivery Plan

**Platform:** Master AEO (masteraeo.com)  
**Repo:** `aeo-pcs` (working name; product brand is Master AEO)  
**Last updated:** 2026-07-27  
**Status:** Planning + early foundation (v0.1)

This document is the source of truth for scope, phases, milestones, versions, and delivery tracking. Update the **Progress tracker** whenever work lands.

---

## 1. Vision

Help local and SMB businesses measure and improve how often they appear in AI assistant answers (GEO / AI visibility), then give them a concrete action plan, progress checklist, subscription, and insights over time.

**Surfaces**

| Surface | App | Audience |
|---------|-----|----------|
| Public marketing site | `apps/web` | Prospects |
| Business panel | `apps/web` `/app/*` | Paying / invited businesses |
| Admin panel | `apps/admin` | Platform operators |
| API | `apps/api` | All clients |
| Shared types | `packages/shared` | Web + API (+ admin) |

**Out of scope for early versions**

- Real multi-provider LLM calls (ChatGPT / Gemini / Perplexity APIs). **Planned: simulated multi-model via Claude style prompts.**
- Live Stripe checkout (billing UI can stub until payments phase).
- Public self-serve signup (UI exists; **signup disabled** until invited/onboarding is ready).

---

## 2. Product requirements (consolidated)

### 2.1 Public face
- Marketing landing for Master AEO (brand-first hero, product story, CTA).
- Pricing page (backed by Plans when available).
- Login + Signup pages (signup disabled / invite-only messaging for now).

### 2.2 Auth & onboarding
- Business accounts can log in.
- Signup disabled for now; admin can create users / business accounts.
- After signup **or** on login if profile incomplete → force **business profile completion** before panel features.
- Profile fields (beyond name/category/location):
  1. Website URL (**required**)
  2. Google Business Profile link (**optional**)
  3. Social media links (**addable** list)
- Visibility flow must **not** re-collect core business identity; use saved profile.

### 2.3 Business panel
- Dashboard insights (business-scoped).
- Visibility checks via a real **stepper** (not one long page).
- Visibility history: previous month vs current month and past runs.
- Action plan with **checklist** (user marks manual/automatable progress).
- Subscription status and plan entitlements.
- Billing history (stub → real payments later).
- Settings to edit business profile.

### 2.4 Admin panel
- Create / manage users and business accounts.
- Plans CRUD.
- Usage & cost insights (tokens in/out, model, who, when, feature refs).
- Profit view: revenue (plans) − estimated LLM cost.

### 2.5 Usage / token accounting
Every Claude call must log:
- Who (userId, businessId)
- When
- Feature (search, prompts, visibility, plan, content, …)
- Model
- Input tokens, output tokens
- References (jobId, prompt index, simulated model label, etc.)

### 2.6 Data safety
Schema changes are **additive-first**. Renames use dual-read → backfill → drop old. No destructive drops of user data. See §7.

### 2.7 Known engineering fixes
- Redux Persist SSR: avoid `localStorage` import on server (noop storage pattern).
- Env: load `apps/api/.env` from file path; **no default env values** — all required.

---

## 3. Current foundation (already done)

Tracked as **v0.1 — Foundation**.

| Item | Status | Notes |
|------|--------|--------|
| Monorepo workspaces (`apps/api`, `apps/web`, `packages/shared`) | Done | Root npm workspaces |
| Shared `CATEGORIES`, `MODELS`, DTOs | Done | `packages/shared` |
| Express API + Mongo + validators + rate limits | Done | Basic visibility pipeline |
| Claude server-side only (no browser secrets) | Done | |
| Simulated multi-model (Claude styles) | Done | Intentional |
| Business search / prompts / visibility **jobs** / plan / content / report | Done | Anonymous-ish job model today |
| Next static export + Ant Design + RTK + Persist | Done | Wizard exists as single-page flow |
| Country field end-to-end | Done | |
| Env required vars, path-resolved `.env` | Done | No defaults |
| Cursor rule: never read `.env` secrets | Done | `.cursor/rules/no-env-secrets.mdc` |
| MVP reference file kept | Done | `geo-visibility-mvp-v3.jsx` |
| Public marketing site | Done | Home, features, pricing, about + public nav/footer |
| Auth / users / roles | Done | JWT login; signup disabled via SIGNUP_ENABLED |
| Business profile gate + links | Done | Onboarding + ProfileGate; visibility blocked until complete |
| Stepper UX | Not started | Still single page inside /app/visibility |
| Usage token logging | Not started | |
| Business panel (insights, checklist, billing) | Not started | |
| Admin app | Partial | Vite app + login + users/businesses; plans/usage placeholders |
| Plans / subscriptions | Not started | |
| Redux Persist SSR fix | Done | Client noop storage; persist business/prompts + jobId only |

---

## 4. Versioning scheme

| Version | Name | Goal |
|---------|------|------|
| **v0.1** | Foundation | API + wizard split (current) |
| **v0.2** | Platform shell | Persist fix, auth, users/businesses, profile gate, public + login |
| **v0.3** | Business panel | Stepper, history, MoM insights, action checklist |
| **v0.4** | Monetization core | Plans CRUD, subscriptions, billing stub, entitlements |
| **v0.5** | Admin + profit | Admin app, usage logs, cost/revenue insights |
| **v1.0** | Public launch | Enable signup, polish marketing, harden quotas/security |
| **v1.x** | Growth | Real payments, email, real multi-model providers (optional) |

Versions can ship as internal milestones before public launch.

---

## 5. Phases & milestones

### Phase A — Stabilize foundation (v0.2 start)
**Milestone A1 — Client hardening**
- [x] Fix redux-persist SSR storage (client-only / noop)
- [x] Persist only light draft state (not huge LLM payloads)
- [x] Brand copy → Master AEO (replace PCS placeholders in UI/report)

**Milestone A2 — Identity models (additive)**
- [x] `User` (email, passwordHash, role: `admin` | `business`, status)
- [x] `Business` linked to user (profile fields + `profileCompletedAt`)
- [x] Attach `userId` / `businessId` to `VisibilityJob` (keep old jobs readable)

**Exit:** API boots with auth models; no user data loss path defined.

---

### Phase B — Public face & auth (v0.2)
**Milestone B1 — Marketing**
- [x] Landing page (brand-first)
- [x] Pricing placeholder
- [x] Shared public layout / nav
- [x] Features + About pages (public site face)

**Milestone B2 — Auth UX**
- [x] Login page
- [x] Signup page **disabled** (message: invite-only / contact)
- [x] JWT (or session) auth on API; `GET /me`
- [x] Protected `/app/*` client gate

**Milestone B3 — Profile onboarding gate**
- [x] Onboarding form: website (required), Google Business (optional), social links (addable)
- [x] Plus existing name/category/city/country/description
- [x] Redirect incomplete profiles to onboarding after login
- [x] Block visibility until `profileCompletedAt` set

**Exit:** User can log in (seeded/admin-created), complete profile, reach empty panel shell.

---

### Phase C — Business panel core (v0.3)
**Milestone C1 — Panel shell**
- [ ] `/app` layout: nav (Dashboard, Visibility, Action plan, Subscription, Billing, Settings)
- [ ] Settings: edit business profile

**Milestone C2 — Visibility stepper**
- [ ] Real Steps UI (one step visible at a time)
- [ ] Steps: confirm business → prompts → run → results → plan
- [ ] No mid-flow business search identity capture (optional “verify listing” later)

**Milestone C3 — History & insights**
- [ ] List past visibility jobs
- [ ] Current month vs previous month visibility score
- [ ] Dashboard cards: latest score, trend, checklist progress

**Milestone C4 — Action plan checklist**
- [ ] Persist checklist state per business / plan item
- [ ] User can tick items; store `done`, `doneAt`, optional note
- [ ] Progress % on dashboard

**Exit:** Business can run checks in stepper, see MoM, work checklist.

---

### Phase D — Plans & billing shell (v0.4)
**Milestone D1 — Plans**
- [ ] Plan model + admin CRUD (name, price, currency, limits, features, active)
- [ ] Public pricing reads active plans

**Milestone D2 — Subscriptions**
- [ ] Subscription per business (planId, period, status)
- [ ] Enforce basic entitlements (e.g. runs/month) on visibility job create
- [ ] Business “Subscription” page

**Milestone D3 — Billing stub**
- [ ] Invoice/payment records (manual/admin-assigned OK)
- [ ] Business “Billing” page lists history
- [ ] (Defer Stripe to v1.x)

**Exit:** Plan assigned to business; UI shows subscription + billing stub; quotas enforced lightly.

---

### Phase E — Admin & usage profit (v0.5)
**Milestone E1 — Admin app scaffold**
- [x] `apps/admin` Vite + React + TS + RTK + Persist + Ant Design
- [x] Admin login (role gate)

**Milestone E2 — Admin operations**
- [x] Create users / business accounts
- [ ] Plans CRUD UI
- [x] List businesses, disable users

**Milestone E3 — Usage logging**
- [ ] Wrap Claude client: persist `UsageEvent` every call
- [ ] Fields: user, business, feature, model, input/output tokens, refs, timestamps
- [ ] Backfill not required for old calls

**Milestone E4 — Insights & profit**
- [ ] Admin dashboard: tokens by day/feature/model/user
- [ ] Configurable cost rates per model
- [ ] Revenue from active subscriptions − estimated cost = margin
- [ ] Business-facing “your usage this period” (optional same milestone)

**Exit:** Operators can run the platform commercially with visibility into cost/profit.

---

### Phase F — Launch readiness (v1.0)
**Milestone F1 — Signup enable**
- [ ] Feature flag `SIGNUP_ENABLED`
- [ ] Signup collects account + starts profile onboarding
- [ ] Email verification (optional but recommended)

**Milestone F2 — Hardening**
- [ ] Rate limits per user, audit logs, backup runbook
- [ ] Schema migration scripts folder + docs
- [ ] Marketing polish, SEO basics, legal pages stubs

**Milestone F3 — Launch checklist**
- [ ] Seed admin user
- [ ] Production env (API, Mongo, web static host, CORS)
- [ ] Smoke test full business journey

**Exit:** Public launch candidate.

---

### Phase G — Later (v1.x+)
- Stripe (or local PSP) real billing
- Email transactional (receipts, invites)
- Real OpenAI / Gemini / Perplexity providers (replace or supplement simulation)
- Team seats, agencies, white-label
- PDF reports (not HTML print workaround only)

---

## 6. Information architecture

### Public (`apps/web`)
```
/                     Landing
/pricing              Plans
/login
/signup               Disabled until v1.0
```

### Business (`apps/web`)
```
/app/onboarding/profile   Forced if incomplete
/app                      Dashboard / insights
/app/visibility           Stepper + history
/app/action-plan          Checklist + generated content
/app/subscription
/app/billing
/app/settings             Business profile
```

### Admin (`apps/admin`) — Vite, port 5173
```
/login
/                     Overview
/users                Create & manage business users
/businesses           List profiles
/plans                Placeholder (v0.4)
/usage                Placeholder (v0.5)
```

---

## 7. Data model (target) & migration policy

### 7.1 Collections (target)

**User**  
`email`, `passwordHash`, `role`, `status`, timestamps  

**Business**  
`ownerUserId`, `name`, `category`, `city`, `country`, `description`,  
`websiteUrl`, `googleBusinessUrl?`, `socialLinks[{ label, url }]`,  
`profileCompletedAt?`, timestamps  

**Plan**  
`name`, `price`, `currency`, `limits`, `features`, `active`  

**Subscription**  
`businessId`, `planId`, `status`, `currentPeriodStart`, `currentPeriodEnd`  

**Invoice** (stub OK)  
`businessId`, `amount`, `currency`, `status`, `periodLabel`, `createdAt`  

**VisibilityJob**  
Existing fields + `userId`, `businessId` (additive)  

**ActionChecklistItem**  
`businessId`, `jobId?`, `itemKey`, `title`, `kind: automatable|manual`,  
`done`, `doneAt?`, `note?`  

**UsageEvent**  
`userId`, `businessId?`, `feature`, `model`, `inputTokens`, `outputTokens`,  
`refs` (object), `createdAt`  

### 7.2 Schema evolution rules
1. Prefer **add field** over rename.
2. Rename: dual-read in code → migration `$rename` / backfill → remove old reads → optional `$unset`.
3. Never drop collections with user/billing/usage data to “fix” schema.
4. Soft-delete users (`status: disabled`) rather than hard delete when audit matters.
5. Keep versioned scripts under `apps/api/scripts/migrations/` (to be added in Phase E/F).
6. Backup before any rename/backfill in shared environments.

---

## 8. API roadmap (high level)

| Area | Endpoints (illustrative) |
|------|---------------------------|
| Auth | `POST /auth/login`, `POST /auth/signup` (disabled), `GET /auth/me` |
| Business | `GET/PATCH /businesses/me`, `POST /businesses/me/complete-profile` |
| Visibility | Existing job routes + require auth + businessId |
| Checklist | `GET/PATCH /action-plan/checklist` |
| Insights | `GET /insights/overview` (MoM scores, progress) |
| Plans | Public list; admin CRUD |
| Subscription / billing | `GET /subscriptions/me`, `GET /billing/invoices` |
| Admin | users, businesses, plans, usage aggregates |
| Usage | written internally by Claude wrapper |

---

## 9. Progress tracker

Update this table as work completes.

| ID | Milestone | Version | Status | Completed |
|----|-----------|---------|--------|-----------|
| — | Monorepo + API/web split + jobs | v0.1 | **Done** | 2026-07-27 |
| — | Country field | v0.1 | **Done** | 2026-07-27 |
| — | Env required + path fix | v0.1 | **Done** | 2026-07-27 |
| — | no-env-secrets Cursor rule | v0.1 | **Done** | 2026-07-27 |
| A1 | Persist SSR fix + branding | v0.2 | **Done** | 2026-07-27 |
| A2 | User + Business models | v0.2 | **Done** | 2026-07-27 |
| B1 | Landing + pricing shell | v0.2 | **Done** | 2026-07-27 |
| B2 | Login + disabled signup + JWT | v0.2 | **Done** | 2026-07-27 |
| B3 | Profile onboarding gate | v0.2 | **Done** | 2026-07-27 |
| C1 | Business panel shell | v0.3 | Todo | |
| C2 | Visibility stepper | v0.3 | Todo | |
| C3 | History + MoM insights | v0.3 | Todo | |
| C4 | Action checklist | v0.3 | Todo | |
| D1–D3 | Plans, subscription, billing stub | v0.4 | Todo | |
| E1–E2 | Admin scaffold + users/businesses | v0.5 (pulled early) | **Partial** | 2026-07-27 |
| E3–E4 | Usage logging + profit | v0.5 | Todo | |
| F1–F3 | Signup enable + launch | v1.0 | Todo | |

---

## 10. Recommended next execution order

1. **A1** Persist fix + Master AEO branding  
2. **A2 + B2** Auth models + login (seed admin + one business)  
3. **B3** Profile gate (website / GBP / socials)  
4. **B1** Landing page  
5. **C2** Stepper (highest UX pain vs current single page)  
6. **C3–C4** Insights + checklist  
7. **E3** Usage logging early if cost visibility is urgent (can pull ahead of admin UI)  
8. **D + E** Plans/admin/profit  

---

## 11. Open decisions

| Topic | Default for now | Revisit |
|-------|-----------------|--------|
| Auth token storage | Access JWT in memory + refresh httpOnly cookie (or localStorage MVP) | Before v1.0 |
| Signup | Disabled | v1.0 flag |
| Multi-model | Simulated via Claude | v1.x |
| Payments | Admin-assigned plan + billing stub | v1.x Stripe |
| Business search step | Drop from main path; profile is source of truth | Optional “enrich from web” later |

---

## 12. Document maintenance

- Owner: update this file in the same PR/session that completes a milestone.
- When a milestone finishes: check boxes in §5, set Status/Completed in §9.
- Do not invent parallel “plans” in chat — amend this doc.

**Related**

- Prototype reference: `/geo-visibility-mvp-v3.jsx`
- Env examples: `apps/api/.env.example`, `apps/web/.env.example`
- Secrets rule: `.cursor/rules/no-env-secrets.mdc`
